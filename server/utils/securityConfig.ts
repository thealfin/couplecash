import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { getSupabaseAdmin } from './supabaseAdmin'

// ── WebAuthn RP Configuration ──
export function getWebAuthnConfig(event?: H3Event) {
  const host = event ? (getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || '') : ''
  const hostname = host.split(':')[0] || 'localhost'

  const rpName = process.env.WEBAUTHN_RP_NAME || 'CoupleCash'
  
  // RP ID must be an effective domain or localhost (no port, no scheme)
  let rpID = process.env.WEBAUTHN_RP_ID
  if (!rpID) {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      rpID = 'localhost'
    } else {
      rpID = hostname
    }
  }

  // Origin must include protocol and port if non-standard
  let origin = process.env.WEBAUTHN_ORIGIN
  if (!origin) {
    if (event) {
      const proto = getHeader(event, 'x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
      origin = `${proto}://${host}`
    } else {
      origin = 'http://localhost:3000'
    }
  }

  return {
    rpName,
    rpID,
    origin,
  }
}

// ── WebAuthn Challenge Storage (Memory with TTL) ──
interface StoredChallenge {
  challenge: string
  userId: string
  type: 'register' | 'authenticate'
  createdAt: number
  expiresAt: number
}

const challengeMap = new Map<string, StoredChallenge>()

// Cleanup challenges older than 5 minutes every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of challengeMap.entries()) {
    if (val.expiresAt < now) {
      challengeMap.delete(key)
    }
  }
}, 60000)

export function storeWebAuthnChallenge(userId: string, challenge: string, type: 'register' | 'authenticate'): string {
  const challengeKey = `ch_${userId}_${type}_${crypto.randomBytes(8).toString('hex')}`
  // Expire in 5 minutes
  challengeMap.set(challengeKey, {
    challenge,
    userId,
    type,
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000,
  })
  return challengeKey
}

export function getAndConsumeWebAuthnChallenge(challengeKey: string, userId: string, type: 'register' | 'authenticate'): string | null {
  const stored = challengeMap.get(challengeKey)
  if (!stored) return null
  challengeMap.delete(challengeKey)

  if (stored.userId !== userId || stored.type !== type || stored.expiresAt < Date.now()) {
    return null
  }
  return stored.challenge
}

// ── PIN Hashing & Verification (PBKDF2-SHA512 with 100,000 iterations) ──
export async function hashPin(pin: string): Promise<string> {
  if (!pin || pin.length < 4 || pin.length > 32) {
    throw new Error('PIN harus berisi antara 4 sampai 32 digit.')
  }
  const salt = crypto.randomBytes(16).toString('hex')
  const rounds = 100000
  const keyLength = 64
  const digest = 'sha512'

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(pin, salt, rounds, keyLength, digest, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(`$pbkdf2$v1$rounds=${rounds}$salt=${salt}$${derivedKey.toString('hex')}`)
    })
  })
}

export async function verifyPin(pin: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash || !pin) return false

  // Format: $pbkdf2$v1$rounds=100000$salt=...$hash
  if (storedHash.startsWith('$pbkdf2$v1$')) {
    const parts = storedHash.split('$')
    // parts[0] = "", parts[1] = "pbkdf2", parts[2] = "v1", parts[3] = "rounds=100000", parts[4] = "salt=...", parts[5] = hash
    const roundsPart = parts[3] || 'rounds=100000'
    const rounds = parseInt(roundsPart.replace('rounds=', ''), 10) || 100000
    const saltPart = parts[4] || ''
    const salt = saltPart.replace('salt=', '')
    const expectedHashHex = parts[5] || ''

    return new Promise((resolve) => {
      crypto.pbkdf2(pin, salt, rounds, 64, 'sha512', (err, derivedKey) => {
        if (err) return resolve(false)
        const expectedBuf = Buffer.from(expectedHashHex, 'hex')
        if (expectedBuf.length !== derivedKey.length) return resolve(false)
        resolve(crypto.timingSafeEqual(expectedBuf, derivedKey))
      })
    })
  }

  // Fallback if legacy SHA-256 hash was stored:
  const shaHash = crypto.createHash('sha256').update(pin).digest('hex')
  if (storedHash === shaHash) {
    return true
  }

  return false
}

// ── Vault Authorization Token (HMAC-SHA256, 5-minute validity) ──
const SECRET_SIGNING_KEY = process.env.VAULT_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) || 'couplecash_vault_auth_secret_key_2026'

export function issueVaultAuthToken(userId: string, householdId: string, method: 'biometric' | 'pin'): string {
  const payload = {
    userId,
    householdId,
    method,
    exp: Date.now() + 5 * 60 * 1000, // 5 minutes
    iat: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex'),
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', SECRET_SIGNING_KEY).update(payloadB64).digest('base64url')
  return `${payloadB64}.${signature}`
}

export function verifyVaultAuthToken(token: string | null | undefined, expectedUserId: string): { valid: boolean; method?: string } {
  if (!token) return { valid: false }
  const parts = token.split('.')
  if (parts.length !== 2) return { valid: false }

  const [payloadB64, signature] = parts
  const expectedSig = crypto.createHmac('sha256', SECRET_SIGNING_KEY).update(payloadB64).digest('base64url')

  if (signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return { valid: false }
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))
    if (payload.userId !== expectedUserId || payload.exp < Date.now()) {
      return { valid: false }
    }
    return { valid: true, method: payload.method }
  } catch {
    return { valid: false }
  }
}

// ── Security Headers Helper ──
export function setSensitiveSecurityHeaders(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  setResponseHeader(event, 'Pragma', 'no-cache')
  setResponseHeader(event, 'Expires', '0')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
}

// ── Audit Logging Helper ──
export async function logSecurityAudit(params: {
  householdId: string
  userId?: string | null
  entityType: 'vault' | 'biometric' | 'pin' | 'security'
  entityId: string
  action: string
  metadata?: Record<string, any>
}) {
  try {
    const admin = getSupabaseAdmin()
    // Sanitize metadata: absolutely NO secrets, keys, or passwords
    const safeMetadata: Record<string, any> = { ...(params.metadata || {}) }
    delete safeMetadata.secret
    delete safeMetadata.password
    delete safeMetadata.pin
    delete safeMetadata.key
    delete safeMetadata.privateKey
    delete safeMetadata.secretEncrypted

    await admin.from('audit_logs').insert({
      household_id: params.householdId,
      user_id: params.userId || null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      metadata: safeMetadata,
    })
  } catch (err: any) {
    console.warn('[logSecurityAudit] failed to write audit log:', err?.message)
  }
}
