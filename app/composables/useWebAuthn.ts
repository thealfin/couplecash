import { startRegistration, startAuthentication } from '@simplewebauthn/browser'

export function useWebAuthn() {
  const { getAuthToken } = useAuth()
  const isSupported = ref(false)
  const isPlatformAvailable = ref(false)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  onMounted(async () => {
    checkSupport()
  })

  async function checkSupport(): Promise<boolean> {
    if (!import.meta.client) return false
    try {
      if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
        isSupported.value = true
        if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
          isPlatformAvailable.value = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        } else {
          isPlatformAvailable.value = true
        }
        return isPlatformAvailable.value
      }
    } catch {
      isSupported.value = false
      isPlatformAvailable.value = false
    }
    return false
  }

  function mapWebAuthnError(err: any): string {
    const name = err?.name || ''
    const msg = err?.message || ''

    if (name === 'NotAllowedError') {
      return 'Verifikasi dibatalkan atau izin biometrik tidak diberikan.'
    }
    if (name === 'InvalidStateError') {
      return 'Perangkat atau kunci biometrik ini sudah terdaftar sebelumnya.'
    }
    if (name === 'NotSupportedError') {
      return 'Perangkat atau peramban ini belum mendukung autentikasi biometrik.'
    }
    if (name === 'AbortError') {
      return 'Proses autentikasi dihentikan.'
    }
    if (name === 'ConstraintError') {
      return 'Perangkat tidak memenuhi syarat keamanan yang diminta.'
    }
    if (msg.includes('challenge')) {
      return 'Sesi keamanan telah kadaluarsa. Silakan coba lagi.'
    }
    return msg || 'Terjadi kendala pada verifikasi biometrik. Silakan coba lagi atau gunakan PIN.'
  }

  async function registerBiometric(deviceName?: string) {
    loading.value = true
    errorMessage.value = null

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Sesi masuk tidak ditemukan. Silakan login kembali.')

      // 1. Request options from server
      const optRes: any = await $fetch('/api/security/webauthn/register/options', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!optRes?.options || !optRes?.challengeKey) {
        throw new Error('Gagal memuat parameter pendaftaran biometrik.')
      }

      // 2. Browser platform authenticator prompt
      let attResp: any
      try {
        attResp = await startRegistration({ optionsJSON: optRes.options })
      } catch (browserErr: any) {
        throw new Error(mapWebAuthnError(browserErr))
      }

      // 3. Send response to verify endpoint
      const verifyRes: any = await $fetch('/api/security/webauthn/register/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          response: attResp,
          challengeKey: optRes.challengeKey,
          deviceName: deviceName || 'Perangkat Biometrik',
        },
      })

      return verifyRes
    } catch (err: any) {
      const friendlyMsg = err?.data?.statusMessage || err?.message || 'Gagal mendaftarkan biometrik'
      errorMessage.value = friendlyMsg
      throw new Error(friendlyMsg)
    } finally {
      loading.value = false
    }
  }

  async function authenticateBiometric() {
    loading.value = true
    errorMessage.value = null

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Sesi masuk tidak ditemukan. Silakan login kembali.')

      // 1. Request options from server
      const optRes: any = await $fetch('/api/security/webauthn/authenticate/options', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!optRes?.options || !optRes?.challengeKey) {
        throw new Error('Gagal memuat parameter verifikasi biometrik.')
      }

      // 2. Browser platform authenticator prompt
      let asseResp: any
      try {
        asseResp = await startAuthentication({ optionsJSON: optRes.options })
      } catch (browserErr: any) {
        throw new Error(mapWebAuthnError(browserErr))
      }

      // 3. Send response to verify endpoint
      const verifyRes: any = await $fetch('/api/security/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          response: asseResp,
          challengeKey: optRes.challengeKey,
        },
      })

      return verifyRes
    } catch (err: any) {
      const friendlyMsg = err?.data?.statusMessage || err?.message || 'Gagal memverifikasi biometrik'
      errorMessage.value = friendlyMsg
      throw new Error(friendlyMsg)
    } finally {
      loading.value = false
    }
  }

  return {
    isSupported,
    isPlatformAvailable,
    loading,
    errorMessage,
    checkSupport,
    registerBiometric,
    authenticateBiometric,
  }
}
