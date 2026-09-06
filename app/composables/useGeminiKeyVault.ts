const DB_NAME = 'couplecash-vault'
const DB_VERSION = 1
const STORE_NAME = 'keys'
const KEY_ID = 'gemini-api-key'
const MASTER_KEY_ID = 'master-encryption-key'

const MASTER_KEY_SALT = 'couplecash-byok-v1-salt'
const PBKDF2_ITERATIONS = 100000

async function getDB() {
  if (!import.meta.client) return null
  const { openDB } = await import('idb')
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

async function deriveKey(): Promise<CryptoKey | null> {
  const db = await getDB()
  if (!db) return null
  let masterKeyRaw = await db.get(STORE_NAME, MASTER_KEY_ID)

  if (!masterKeyRaw) {
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    masterKeyRaw = bufferToBase64(rawKey.buffer)
    await db.put(STORE_NAME, masterKeyRaw, MASTER_KEY_ID)
  }

  const keyData = base64ToBuffer(masterKeyRaw)

  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  )

  const salt = new TextEncoder().encode(MASTER_KEY_SALT)

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function useGeminiKeyVault() {
  async function saveGeminiKey(apiKey: string): Promise<void> {
    const key = await deriveKey()
    if (!key) return
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(apiKey),
    )

    const db = await getDB()
    if (!db) return
    await db.put(STORE_NAME, {
      encryptedData: bufferToBase64(encrypted),
      iv: bufferToBase64(iv.buffer),
    }, KEY_ID)
  }

  async function getGeminiKey(): Promise<string | null> {
    try {
      const db = await getDB()
      if (!db) return null
      const record = await db.get(STORE_NAME, KEY_ID)

      if (!record) return null

      const key = await deriveKey()
      if (!key) return null
      const encrypted = base64ToBuffer(record.encryptedData)
      const iv = base64ToBuffer(record.iv)

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted,
      )

      return new TextDecoder().decode(decrypted)
    } catch {
      return null
    }
  }

  async function removeGeminiKey(): Promise<void> {
    const db = await getDB()
    if (!db) return
    await db.delete(STORE_NAME, KEY_ID)
  }

  async function hasGeminiKey(): Promise<boolean> {
    const db = await getDB()
    if (!db) return false
    const record = await db.get(STORE_NAME, KEY_ID)
    return record !== undefined
  }

  return {
    saveGeminiKey,
    getGeminiKey,
    removeGeminiKey,
    hasGeminiKey,
  }
}