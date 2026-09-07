export interface UserProfile {
  id: string
  authUserId: string
  email: string
  fullName: string
  role: 'suami' | 'istri' | 'single'
  avatarInitial: string
}

export interface HouseholdMember {
  id?: string
  fullName: string
  firstName: string
  initial: string
  email?: string
  role?: 'suami' | 'istri' | 'single'
}

export interface HouseholdProfile {
  id: string
  name: string
  motto?: string
  inviteCode?: string
  createdAt?: string
  partnerStatus?: 'single' | 'connected' | 'pending'
  suami: HouseholdMember | null
  istri: HouseholdMember | null
}

let heartbeatTimer: any = null

export function useAuth() {
  const supabase = useSupabase()
  const router = useRouter()

  const authCookie = useCookie<string | null>('couplecash-token', {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    path: '/',
  })

  // Isolate state in Nuxt's useState to prevent SSR memory leakage across users
  const currentUser = useState<UserProfile | null>('auth:currentUser', () => null)
  const currentHousehold = useState<HouseholdProfile | null>('auth:currentHousehold', () => null)
  const hasPartner = useState<boolean>('auth:hasPartner', () => false)
  const isBalanceHidden = useState<boolean>('auth:isBalanceHidden', () => false)
  const isSyncModalOpen = useState<boolean>('auth:isSyncModalOpen', () => false)
  const isHouseholdDetailOpen = useState<boolean>('auth:isHouseholdDetailOpen', () => false)
  const isHouseholdEditOpen = useState<boolean>('auth:isHouseholdEditOpen', () => false)
  const isHouseholdUnlinkOpen = useState<boolean>('auth:isHouseholdUnlinkOpen', () => false)
  const currentToken = useState<string | null>('auth:currentToken', () => null)
  const sessionKickedMessage = useState<string | null>('auth:sessionKickedMessage', () => null)

  function getDeviceId(): string {
    if (!import.meta.client) return 'server'
    let id = localStorage.getItem('couplecash_device_id')
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36)
      localStorage.setItem('couplecash_device_id', id)
    }
    return id
  }

  function getDeviceName(): string {
    if (!import.meta.client) return 'Browser Web'
    const ua = navigator.userAgent
    let platform = 'Web'
    if (/Android/i.test(ua)) platform = 'Android'
    else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS'
    else if (/Windows/i.test(ua)) platform = 'Windows'
    else if (/Macintosh|Mac OS X/i.test(ua)) platform = 'MacOS'
    else if (/Linux/i.test(ua)) platform = 'Linux'

    let browser = 'Browser'
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome'
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
    else if (/Firefox/i.test(ua)) browser = 'Firefox'
    else if (/Edg/i.test(ua)) browser = 'Edge'

    return `${browser} (${platform})`
  }

  function startHeartbeat(token: string) {
    if (!import.meta.client) return
    stopHeartbeat()

    // Send heartbeat every 30 seconds
    heartbeatTimer = setInterval(async () => {
      try {
        const activeToken = await getAuthToken()
        if (!activeToken) {
          stopHeartbeat()
          return
        }

        const res: any = await $fetch('/api/auth/session-lock', {
          method: 'POST',
          headers: { Authorization: `Bearer ${activeToken}` },
          body: {
            deviceId: getDeviceId(),
            deviceName: getDeviceName(),
            action: 'heartbeat',
          },
        })

        if (res?.kicked) {
          // Kicked out by another device!
          stopHeartbeat()
          sessionKickedMessage.value = res.message || 'Sesi Anda telah berakhir karena akun ini sedang aktif di perangkat lain. Silakan masuk menggunakan akun/user lain.'
          await logout(false) // Don't release lock since other device claimed it
          router.push('/auth/login')
        }
      } catch (err: any) {
        // If 401, session expired or revoked
        if (err?.statusCode === 401) {
          console.warn('[useAuth] Heartbeat 401: sesi berakhir')
          stopHeartbeat()
          await logout(false)
          router.push('/auth/login')
        }
      }
    }, 30000)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  async function claimSession(token: string) {
    if (!import.meta.client) return
    try {
      await $fetch('/api/auth/session-lock', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          deviceId: getDeviceId(),
          deviceName: getDeviceName(),
          action: 'claim',
        },
      })
      startHeartbeat(token)
    } catch (err: any) {
      console.warn('[useAuth] claimSession error:', err?.message)
    }
  }

  async function fetchProfile(token: string) {
    try {
      const res: any = await $fetch('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res?.success) {
        currentUser.value = res.user
        currentHousehold.value = res.household
        hasPartner.value = !!(res.household.suami && res.household.istri)

        currentToken.value = token
        authCookie.value = token
        if (import.meta.client) {
          localStorage.setItem('couplecash-token', token)
        }

        // Claim this device as active and start heartbeat
        claimSession(token)
      }
    } catch (error: any) {
      console.error('Failed to fetch profile', error)
      if (error?.statusCode === 401) {
        logout(false)
      }
    }
  }

  async function initializeAuth() {
    if (import.meta.client) {
      const token = await getAuthToken()
      if (token) {
        await fetchProfile(token)
      }

      // Listen to auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
          currentToken.value = session.access_token
          authCookie.value = session.access_token
          if (import.meta.client) {
            localStorage.setItem('couplecash-token', session.access_token)
          }
          if (event === 'SIGNED_IN') {
            await fetchProfile(session.access_token)
          }
        } else if (event === 'SIGNED_OUT') {
          currentUser.value = null
          currentHousehold.value = null
          hasPartner.value = false
          currentToken.value = null
          authCookie.value = null
          stopHeartbeat()
          if (import.meta.client) {
            localStorage.removeItem('couplecash-token')
          }
        }
      })
    }
  }

  async function login(emailInput: string, passwordInput: string): Promise<{ success: boolean; message?: string }> {
    try {
      sessionKickedMessage.value = null
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      })

      if (error) {
        return {
          success: false,
          message: error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah' : error.message,
        }
      }

      if (data.session?.access_token) {
        await fetchProfile(data.session.access_token)
        return { success: true }
      }

      return { success: false, message: 'Gagal mendapatkan sesi login' }
    } catch (error: any) {
      return { success: false, message: error?.message || 'Terjadi kesalahan sistem' }
    }
  }

  async function loginWithGoogle(): Promise<{ success: boolean; message?: string }> {
    try {
      if (!import.meta.client) return { success: false, message: 'Harus dijalankan di klien' }
      sessionKickedMessage.value = null
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/beranda`,
        },
      })
      if (error) {
        return { success: false, message: error.message }
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Gagal memulai login Google' }
    }
  }

  async function register(
    fullName: string,
    role: 'suami' | 'istri' | 'single',
    email: string,
    password?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      sessionKickedMessage.value = null
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || '',
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (error) return { success: false, message: error.message }

      if (data.session) {
        // Auto-confirmed: fetch profile with retry
        let retries = 3
        while (retries > 0) {
          try {
            await fetchProfile(data.session.access_token)
            if (currentUser.value) return { success: true }
          } catch {
            /* retry */
          }
          retries--
          if (retries > 0) await new Promise((r) => setTimeout(r, 800))
        }
        return { success: true }
      }

      // Email confirmation required
      if (data.user && !data.session) {
        return { success: true, message: 'Silakan cek email untuk verifikasi akun Anda.' }
      }

      return { success: true, message: 'Silakan cek email untuk verifikasi.' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Gagal mendaftarkan akun' }
    }
  }

  async function logout(releaseLock = true) {
    const token = currentToken.value
    stopHeartbeat()

    if (releaseLock && token && import.meta.client) {
      try {
        await $fetch('/api/auth/session-lock', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            deviceId: getDeviceId(),
            action: 'release',
          },
        }).catch(() => {})
      } catch {
        /* ignore */
      }
    }

    await supabase.auth.signOut().catch(() => {})
    currentUser.value = null
    currentHousehold.value = null
    hasPartner.value = false
    currentToken.value = null
    authCookie.value = null
    if (import.meta.client) {
      localStorage.removeItem('couplecash-token')
      try {
        useVaultSecurity().lockVault('logout')
      } catch {}
    }
  }

  function syncPartner(_pinCode?: string) {
    hasPartner.value = true
    isSyncModalOpen.value = false
  }

  function openSyncModal() {
    isSyncModalOpen.value = true
  }

  function closeSyncModal() {
    isSyncModalOpen.value = false
  }

  function toggleBalanceVisibility() {
    isBalanceHidden.value = !isBalanceHidden.value
  }

  async function getAuthToken(): Promise<string | null> {
    if (import.meta.client) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          currentToken.value = session.access_token
          authCookie.value = session.access_token
          localStorage.setItem('couplecash-token', session.access_token)
          return session.access_token
        }
      } catch (err) {
        console.warn('[getAuthToken] getSession error:', err)
      }
      const local = localStorage.getItem('couplecash-token')
      if (local) {
        currentToken.value = local
        return local
      }
    }
    if (currentToken.value) return currentToken.value
    if (authCookie.value) return authCookie.value
    return null
  }

  function openHouseholdDetail() {
    isHouseholdDetailOpen.value = true
  }

  function closeHouseholdDetail() {
    isHouseholdDetailOpen.value = false
  }

  function openHouseholdEdit() {
    isHouseholdEditOpen.value = true
  }

  function closeHouseholdEdit() {
    isHouseholdEditOpen.value = false
  }

  function openHouseholdUnlink() {
    isHouseholdUnlinkOpen.value = true
  }

  function closeHouseholdUnlink() {
    isHouseholdUnlinkOpen.value = false
  }

  async function updateHouseholdInfo(name: string, motto?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await getAuthToken()
      const res: any = await $fetch('/api/couple/household', {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: { name, motto },
      })
      if (res.success && currentHousehold.value) {
        currentHousehold.value.name = res.household.name
        currentHousehold.value.motto = res.household.motto
        return { success: true, message: res.message }
      }
      return { success: false, message: 'Gagal memperbarui info keluarga' }
    } catch (err: any) {
      return { success: false, message: err?.data?.statusMessage || err?.message || 'Gagal memperbarui info keluarga' }
    }
  }

  async function unlinkPartner(): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await getAuthToken()
      const res: any = await $fetch('/api/couple/unlink', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.success) {
        hasPartner.value = false
        if (token) {
          await fetchProfile(token)
        }
        closeHouseholdUnlink()
        closeHouseholdDetail()
        return { success: true, message: res.message }
      }
      return { success: false, message: 'Gagal memutuskan hubungan' }
    } catch (err: any) {
      return { success: false, message: err?.data?.statusMessage || err?.message || 'Gagal memutuskan hubungan' }
    }
  }

  return {
    currentUser,
    currentHousehold,
    hasPartner,
    isBalanceHidden,
    isSyncModalOpen,
    isHouseholdDetailOpen,
    isHouseholdEditOpen,
    isHouseholdUnlinkOpen,
    sessionKickedMessage,
    getDeviceId,
    getDeviceName,
    initializeAuth,
    login,
    loginWithGoogle,
    register,
    logout,
    fetchProfile,
    syncPartner,
    openSyncModal,
    closeSyncModal,
    openHouseholdDetail,
    closeHouseholdDetail,
    openHouseholdEdit,
    closeHouseholdEdit,
    openHouseholdUnlink,
    closeHouseholdUnlink,
    updateHouseholdInfo,
    unlinkPartner,
    toggleBalanceVisibility,
    getAuthToken,
  }
}
