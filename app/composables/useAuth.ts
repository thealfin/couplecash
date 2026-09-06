import { ref } from 'vue'

export interface UserProfile {
  id: string
  authUserId: string
  email: string
  fullName: string
  role: 'suami' | 'istri'
  avatarInitial: string
}

export interface HouseholdMember {
  id?: string
  fullName: string
  firstName: string
  initial: string
  email?: string
  role?: 'suami' | 'istri'
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

const currentUser = ref<UserProfile | null>(null)
const currentHousehold = ref<HouseholdProfile | null>(null)
const hasPartner = ref<boolean>(false)
const isBalanceHidden = ref<boolean>(false)
const isSyncModalOpen = ref<boolean>(false)
const isHouseholdDetailOpen = ref<boolean>(false)
const isHouseholdEditOpen = ref<boolean>(false)
const isHouseholdUnlinkOpen = ref<boolean>(false)

// Expose token for useFetch in pages
const currentToken = ref<string | null>(null)

export function useAuth() {
  const supabase = useSupabase()
  const authCookie = useCookie<string | null>('couplecash-token', {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    path: '/',
  })

  async function fetchProfile(token: string) {
    try {
      const res: any = await $fetch('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (res.success) {
        currentUser.value = res.user
        currentHousehold.value = res.household
        hasPartner.value = !!(res.household.suami && res.household.istri)
        
        currentToken.value = token
        authCookie.value = token
        if (import.meta.client) {
          localStorage.setItem('couplecash-token', token)
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile', error)
      logout()
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
        if (event === 'SIGNED_IN' && session?.access_token) {
          await fetchProfile(session.access_token)
        } else if (event === 'SIGNED_OUT') {
          currentUser.value = null
          currentHousehold.value = null
          currentToken.value = null
          authCookie.value = null
          if (import.meta.client) {
            localStorage.removeItem('couplecash-token')
          }
        }
      })
    }
  }

  async function login(emailInput: string, passwordInput: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput
      })

      if (error) {
        return { success: false, message: error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah' : error.message }
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


  async function register(fullName: string, role: 'suami' | 'istri', email: string, password?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || '',
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (error) return { success: false, message: error.message }
      
      if (data.session) {
        // Auto-confirmed: fetch profile with retry (trigger may take a moment)
        let retries = 3
        while (retries > 0) {
          try {
            await fetchProfile(data.session.access_token)
            if (currentUser.value) return { success: true }
          } catch { /* retry */ }
          retries--
          if (retries > 0) await new Promise(r => setTimeout(r, 800))
        }
        // Even if profile fetch failed, auth succeeded
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

  async function logout() {
    await supabase.auth.signOut()
    currentUser.value = null
    currentHousehold.value = null
    hasPartner.value = false
    currentToken.value = null
    authCookie.value = null
    if (import.meta.client) {
      localStorage.removeItem('couplecash-token')
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
    if (currentToken.value) return currentToken.value
    if (authCookie.value) {
      currentToken.value = authCookie.value
      return authCookie.value
    }
    if (import.meta.client) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        currentToken.value = session.access_token
        authCookie.value = session.access_token
        return session.access_token
      }
      // Fallback to localStorage
      const local = localStorage.getItem('couplecash-token')
      if (local) {
        currentToken.value = local
        authCookie.value = local
        return local
      }
    }
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
