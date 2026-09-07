import {
  generateVaultKey,
  encryptVaultSecret,
  decryptVaultSecret,
  getLocalMasterKey,
  saveLocalMasterKey,
  clearLocalMasterKey,
} from '../utils/vaultCrypto'

export type VaultState = 'locked' | 'unlocking' | 'unlocked' | 'expired'

// Global reactive states so state persists across component boundaries during the active session
const vaultState = ref<VaultState>('locked')
const masterKey = shallowRef<CryptoKey | null>(null)
const vaultAuthToken = ref<string | null>(null)
const unlockMethod = ref<'biometric' | 'pin' | null>(null)
const unlockedAt = ref<number>(0)
const expiresAt = ref<number>(0)
const secondsRemaining = ref<number>(0)
const autoLockMinutes = ref<number>(5)

// In-memory store for temporarily revealed secrets
// Format: { [itemId]: { secret: string, expiresAt: number } }
const revealedSecrets = ref<Record<string, { secret: string; expiresAt: number }>>({})

let countdownInterval: any = null
let visibilityListenerAttached = false

export function useVaultSecurity() {
  const { currentUser, getAuthToken } = useAuth()
  const webAuthn = useWebAuthn()

  // Initialize autoLock preference from non-sensitive local setting
  onMounted(() => {
    if (import.meta.client) {
      const savedSetting = localStorage.getItem('couplecash_autolock_minutes')
      if (savedSetting !== null) {
        autoLockMinutes.value = parseInt(savedSetting, 10) || 5
      }

      // Attach visibility change listener to auto-lock when user switches tabs or minimises browser
      if (!visibilityListenerAttached) {
        document.addEventListener('visibilitychange', handleVisibilityChange)
        visibilityListenerAttached = true
      }
    }
  })

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden' && vaultState.value === 'unlocked') {
      // Auto-lock when hidden to protect screen privacy
      lockVault('visibility_hidden')
    }
  }

  function setAutoLockMinutes(minutes: number) {
    autoLockMinutes.value = minutes
    if (import.meta.client) {
      localStorage.setItem('couplecash_autolock_minutes', String(minutes))
    }
    // If currently unlocked, reset timer with new duration
    if (vaultState.value === 'unlocked') {
      startSessionTimer()
    }
  }

  function startSessionTimer() {
    stopSessionTimer()
    const durationMs = autoLockMinutes.value * 60 * 1000
    if (durationMs <= 0) {
      // Immediate auto-lock policy
      secondsRemaining.value = 0
      return
    }

    unlockedAt.value = Date.now()
    expiresAt.value = Date.now() + durationMs
    secondsRemaining.value = Math.floor(durationMs / 1000)

    countdownInterval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.value - Date.now()) / 1000))
      secondsRemaining.value = remaining

      // Clean expired revealed secrets
      const now = Date.now()
      for (const [id, val] of Object.entries(revealedSecrets.value)) {
        if (val.expiresAt <= now) {
          delete revealedSecrets.value[id]
        }
      }

      if (remaining <= 0) {
        lockVault('timeout')
      }
    }, 1000)
  }

  function stopSessionTimer() {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
  }

  /**
   * Resolve or generate Vault Master Key for the user
   */
  async function resolveMasterKey(userId: string, pin?: string): Promise<CryptoKey> {
    // 1. Try to load from IndexedDB
    let key = await getLocalMasterKey(userId, pin)
    if (!key) {
      // 2. If no master key exists yet, generate a new one and persist locally
      key = await generateVaultKey()
      await saveLocalMasterKey(userId, key, pin)
    }
    return key
  }

  /**
   * Unlock Vault with Biometrics (WebAuthn Platform Authenticator)
   */
  async function unlockWithBiometric(): Promise<boolean> {
    if (!currentUser.value?.id) throw new Error('User tidak terautentikasi')
    vaultState.value = 'unlocking'

    try {
      const res = await webAuthn.authenticateBiometric()
      if (res?.success && res?.vaultAuthToken) {
        vaultAuthToken.value = res.vaultAuthToken
        unlockMethod.value = 'biometric'

        // Resolve Master Key
        masterKey.value = await resolveMasterKey(currentUser.value.id)
        vaultState.value = 'unlocked'
        startSessionTimer()

        // Log audit
        auditAction('VAULT_UNLOCKED', { method: 'biometric' })
        return true
      }
      vaultState.value = 'locked'
      return false
    } catch (err: any) {
      vaultState.value = 'locked'
      throw err
    }
  }

  /**
   * Unlock Vault with PIN Fallback
   */
  async function unlockWithPin(pin: string): Promise<boolean> {
    if (!currentUser.value?.id) throw new Error('User tidak terautentikasi')
    vaultState.value = 'unlocking'

    try {
      const token = await getAuthToken()
      const res: any = await $fetch('/api/security/pin/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { pin },
      })

      if (res?.success && res?.vaultAuthToken) {
        vaultAuthToken.value = res.vaultAuthToken
        unlockMethod.value = 'pin'

        // Resolve Master Key using PIN wrapping support
        masterKey.value = await resolveMasterKey(currentUser.value.id, pin)
        vaultState.value = 'unlocked'
        startSessionTimer()

        auditAction('VAULT_UNLOCKED', { method: 'pin' })
        return true
      }

      vaultState.value = 'locked'
      return false
    } catch (err: any) {
      vaultState.value = 'locked'
      throw err
    }
  }

  /**
   * Lock Vault immediately and wipe all secrets and master keys from memory
   */
  function lockVault(reason = 'manual') {
    stopSessionTimer()
    // Memory purge: zero out master key & revealed secrets
    masterKey.value = null
    vaultAuthToken.value = null
    unlockMethod.value = null
    revealedSecrets.value = {}
    secondsRemaining.value = 0
    vaultState.value = reason === 'timeout' ? 'expired' : 'locked'

    if (reason !== 'unmounted') {
      auditAction('VAULT_LOCKED', { reason })
    }
  }

  /**
   * Client-side encrypt a plaintext secret using active Master Key
   */
  async function encryptSecret(plaintext: string): Promise<{ ciphertext: string; iv: string; version: number }> {
    if (!masterKey.value) {
      throw new Error('Brankas terkunci. Silakan buka brankas terlebih dahulu.')
    }
    return await encryptVaultSecret(plaintext, masterKey.value)
  }

  /**
   * Client-side decrypt a ciphertext secret using active Master Key
   */
  async function decryptSecret(ciphertext: string, iv: string): Promise<string> {
    if (!masterKey.value) {
      throw new Error('Brankas terkunci. Silakan buka brankas terlebih dahulu.')
    }
    return await decryptVaultSecret(ciphertext, iv, masterKey.value)
  }

  /**
   * Temporarily reveal a secret in memory for a countdown period (e.g. 15s)
   */
  async function revealSecret(itemId: string, ciphertext: string, iv: string, timeoutSeconds = 15): Promise<string> {
    if (revealedSecrets.value[itemId]) {
      return revealedSecrets.value[itemId].secret
    }

    const decrypted = await decryptSecret(ciphertext, iv)
    revealedSecrets.value[itemId] = {
      secret: decrypted,
      expiresAt: Date.now() + timeoutSeconds * 1000,
    }

    // Auto-clear memory when timeout arrives
    setTimeout(() => {
      if (revealedSecrets.value[itemId]) {
        delete revealedSecrets.value[itemId]
      }
    }, timeoutSeconds * 1000)

    auditAction('VAULT_SECRET_VIEWED', { itemId })
    return decrypted
  }

  /**
   * Hide revealed secret immediately
   */
  function hideSecret(itemId: string) {
    if (revealedSecrets.value[itemId]) {
      delete revealedSecrets.value[itemId]
    }
  }

  /**
   * Copy secret to clipboard with immediate memory wipe
   */
  async function copySecret(itemId: string, ciphertext: string, iv: string): Promise<boolean> {
    try {
      const decrypted = await decryptSecret(ciphertext, iv)
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(decrypted)
        auditAction('VAULT_SECRET_COPIED', { itemId })
        return true
      }
      return false
    } catch (err) {
      console.error('[copySecret] error:', err)
      return false
    }
  }

  async function auditAction(action: string, metadata?: Record<string, any>) {
    try {
      const token = await getAuthToken()
      if (!token) return
      await $fetch('/api/vault/audit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          action,
          ...metadata,
        },
      })
    } catch {
      // Audit log fail-silent on client
    }
  }

  return {
    vaultState,
    masterKey,
    unlockMethod,
    autoLockMinutes,
    secondsRemaining,
    revealedSecrets,
    setAutoLockMinutes,
    unlockWithBiometric,
    unlockWithPin,
    lockVault,
    encryptSecret,
    decryptSecret,
    revealSecret,
    hideSecret,
    copySecret,
  }
}
