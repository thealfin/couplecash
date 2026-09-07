import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'couplecash_vault_db'
const DB_VERSION = 1
const KEY_STORE = 'vault_key_material'
const META_STORE = 'security_metadata'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!import.meta.client) {
    throw new Error('Web Crypto and IndexedDB are only available in the browser.')
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(KEY_STORE)) {
          db.createObjectStore(KEY_STORE)
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE)
        }
      },
    })
  }
  return dbPromise
}

// ── Helpers for Base64 / ArrayBuffer conversion ──

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ── Web Crypto AES-256-GCM Operations ──

/**
 * Generate a cryptographically strong 256-bit AES-GCM CryptoKey
 */
export async function generateVaultKey(): Promise<CryptoKey> {
  if (!crypto?.subtle) {
    throw new Error('Web Crypto API tidak tersedia pada browser ini.')
  }
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable for export/wrapping if needed
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a plaintext secret using AES-256-GCM with a random 96-bit IV
 */
export async function encryptVaultSecret(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string; version: number }> {
  if (!crypto?.subtle) throw new Error('Web Crypto API tidak didukung.')
  
  // 96-bit (12-byte) random IV as recommended by NIST for AES-GCM
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)

  const encoder = new TextEncoder()
  const encodedPlaintext = encoder.encode(plaintext)

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedPlaintext
  )

  return {
    ciphertext: arrayBufferToBase64(cipherBuffer),
    iv: arrayBufferToBase64(iv),
    version: 1,
  }
}

/**
 * Decrypt an AES-256-GCM ciphertext using the provided CryptoKey and IV
 */
export async function decryptVaultSecret(
  ciphertextB64: string,
  ivB64: string,
  key: CryptoKey
): Promise<string> {
  if (!crypto?.subtle) throw new Error('Web Crypto API tidak didukung.')

  const ciphertextBytes = base64ToArrayBuffer(ciphertextB64)
  const ivBytes = base64ToArrayBuffer(ivB64)

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    ciphertextBytes
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}

// ── PIN-based Key Derivation (PBKDF2-SHA256, 250,000 iterations) ──

export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!crypto?.subtle) throw new Error('Web Crypto API tidak didukung.')

  const encoder = new TextEncoder()
  const pinBytes = encoder.encode(pin)

  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )
}

// ── Master Key Wrapping & IndexedDB Persistence ──

/**
 * Store the active Master Key in IndexedDB securely wrapped with a device PIN or device salt
 */
export async function saveLocalMasterKey(userId: string, masterKey: CryptoKey, pin?: string): Promise<void> {
  const db = await getDb()
  const rawKey = await crypto.subtle.exportKey('raw', masterKey)
  
  if (pin) {
    // Wrap key with PIN
    const salt = new Uint8Array(16)
    crypto.getRandomValues(salt)
    const pinKey = await deriveKeyFromPin(pin, salt)
    const iv = new Uint8Array(12)
    crypto.getRandomValues(iv)

    const wrappedKeyBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      pinKey,
      rawKey
    )

    await db.put(
      KEY_STORE,
      {
        userId,
        wrappedKey: arrayBufferToBase64(wrappedKeyBuffer),
        iv: arrayBufferToBase64(iv),
        salt: arrayBufferToBase64(salt),
        updatedAt: Date.now(),
      },
      `master_key_${userId}`
    )
  } else {
    // Store directly in local IndexedDB CryptoKey format
    await db.put(
      KEY_STORE,
      {
        userId,
        rawKey: arrayBufferToBase64(rawKey),
        updatedAt: Date.now(),
      },
      `master_key_${userId}`
    )
  }
}

/**
 * Retrieve the Master Key from IndexedDB
 */
export async function getLocalMasterKey(userId: string, pin?: string): Promise<CryptoKey | null> {
  const db = await getDb()
  const record = await db.get(KEY_STORE, `master_key_${userId}`)
  if (!record) return null

  try {
    if (record.wrappedKey && pin) {
      const salt = base64ToArrayBuffer(record.salt)
      const pinKey = await deriveKeyFromPin(pin, salt)
      const iv = base64ToArrayBuffer(record.iv)
      const wrappedBytes = base64ToArrayBuffer(record.wrappedKey)

      const rawKeyBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        pinKey,
        wrappedBytes
      )

      return await crypto.subtle.importKey(
        'raw',
        rawKeyBuffer,
        'AES-GCM',
        true,
        ['encrypt', 'decrypt']
      )
    } else if (record.rawKey) {
      const rawKeyBytes = base64ToArrayBuffer(record.rawKey)
      return await crypto.subtle.importKey(
        'raw',
        rawKeyBytes,
        'AES-GCM',
        true,
        ['encrypt', 'decrypt']
      )
    }
  } catch (err) {
    console.warn('[getLocalMasterKey] Failed to decrypt or import key:', err)
  }
  return null
}

/**
 * Delete local master key material from IndexedDB (e.g. on complete wipe/logout)
 */
export async function clearLocalMasterKey(userId: string): Promise<void> {
  try {
    const db = await getDb()
    await db.delete(KEY_STORE, `master_key_${userId}`)
  } catch (err) {
    console.warn('[clearLocalMasterKey] error:', err)
  }
}
