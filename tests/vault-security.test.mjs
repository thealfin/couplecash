import assert from 'node:assert'
import crypto from 'node:crypto'
import {
  hashPin,
  verifyPin,
  issueVaultAuthToken,
  verifyVaultAuthToken,
  getWebAuthnConfig,
} from '../server/utils/securityConfig.ts'

// Web Crypto API test utilities matching app/utils/vaultCrypto.ts
function arrayBufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return Buffer.from(binary, 'binary').toString('base64')
}

function base64ToArrayBuffer(base64) {
  const buf = Buffer.from(base64, 'base64')
  return new Uint8Array(buf)
}

async function runTests() {
  console.log('🧪 Running CoupleCash Vault & Security Test Suite...\n')

  // ── TEST 1: Web Crypto AES-256-GCM Encryption & Decryption ──
  console.log('Test 1: AES-256-GCM Key Generation, Encryption & Decryption')
  const masterKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  assert(masterKey, 'Master Key should be generated')

  const testSecret = 'SuperSecretPIN#12345!'
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)

  const encoder = new TextEncoder()
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    encoder.encode(testSecret)
  )

  const ciphertextB64 = arrayBufferToBase64(cipherBuffer)
  const ivB64 = arrayBufferToBase64(iv)

  assert.notStrictEqual(ciphertextB64, testSecret, 'Ciphertext must not match plaintext')

  // Decrypt
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(ivB64) },
    masterKey,
    base64ToArrayBuffer(ciphertextB64)
  )
  const decryptedText = new TextDecoder().decode(decryptedBuf)
  assert.strictEqual(decryptedText, testSecret, 'Decrypted text must match original plaintext')
  console.log('  ✓ AES-256-GCM roundtrip encryption/decryption passed.')

  // ── TEST 2: Tampered Ciphertext Rejection ──
  console.log('\nTest 2: Tampered Ciphertext Rejection')
  const tamperedCipherBytes = base64ToArrayBuffer(ciphertextB64)
  tamperedCipherBytes[0] ^= 0xff // flip bits

  let tamperFailed = false
  try {
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      tamperedCipherBytes
    )
  } catch {
    tamperFailed = true
  }
  assert(tamperFailed, 'Tampered ciphertext must be rejected by AES-GCM')
  console.log('  ✓ Tampered ciphertext correctly rejected.')

  // ── TEST 3: Invalid IV Rejection ──
  console.log('\nTest 3: Wrong IV Rejection')
  const wrongIv = new Uint8Array(12)
  crypto.getRandomValues(wrongIv)

  let wrongIvFailed = false
  try {
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: wrongIv },
      masterKey,
      base64ToArrayBuffer(ciphertextB64)
    )
  } catch {
    wrongIvFailed = true
  }
  assert(wrongIvFailed, 'Wrong IV must fail decryption')
  console.log('  ✓ Decryption with wrong IV correctly rejected.')

  // ── TEST 4: PBKDF2 PIN Hashing & Verification ──
  console.log('\nTest 4: PBKDF2 PIN Hashing and Constant-Time Verification')
  const pin = '849201'
  const hash = await hashPin(pin)
  assert(hash.startsWith('$pbkdf2$v1$rounds=100000$'), 'Hash must have standard versioned prefix')

  const valid = await verifyPin(pin, hash)
  assert.strictEqual(valid, true, 'Valid PIN must return true')

  const invalid = await verifyPin('999999', hash)
  assert.strictEqual(invalid, false, 'Invalid PIN must return false')

  const empty = await verifyPin('', hash)
  assert.strictEqual(empty, false, 'Empty PIN must return false')
  console.log('  ✓ PIN PBKDF2 hashing and verification passed.')

  // ── TEST 5: Vault Authorization Token Issuance & Verification ──
  console.log('\nTest 5: Short-Lived Vault Authorization Token')
  const userId = '01955c4d-8cf7-77ef-8025-4fe0ffbb9c1a'
  const householdId = '01955c4d-8cf7-77ef-8025-4fe0ffbb9c1b'

  const token = issueVaultAuthToken(userId, householdId, 'biometric')
  assert(token.includes('.'), 'Token must be header.signature format')

  const validTokenCheck = verifyVaultAuthToken(token, userId)
  assert.strictEqual(validTokenCheck.valid, true, 'Token must be valid for the user')
  assert.strictEqual(validTokenCheck.method, 'biometric')

  const wrongUserCheck = verifyVaultAuthToken(token, 'different-user-id')
  assert.strictEqual(wrongUserCheck.valid, false, 'Token must be invalid for wrong user ID')

  const tamperedToken = token.slice(0, -4) + 'abcd'
  const tamperedCheck = verifyVaultAuthToken(tamperedToken, userId)
  assert.strictEqual(tamperedCheck.valid, false, 'Tampered token signature must fail')
  console.log('  ✓ Vault authorization token issuance and HMAC validation passed.')

  // ── TEST 6: WebAuthn Config Resolution ──
  console.log('\nTest 6: WebAuthn Config Resolution')
  const config = getWebAuthnConfig()
  assert.strictEqual(config.rpName, 'CoupleCash', 'RP name must default to CoupleCash')
  assert.strictEqual(config.rpID, 'localhost', 'RP ID in dev must default to localhost')
  console.log('  ✓ WebAuthn RP configuration correctly resolved.')

  console.log('\n🎉 ALL 6 TEST SUITES PASSED SUCCESSFULLY!\n')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
