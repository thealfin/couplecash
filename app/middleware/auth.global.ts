export default defineNuxtRouteMiddleware(async (to) => {
  // Hanya jalankan di client-side untuk menghindari mismatch SSR session
  if (import.meta.server) return

  const supabase = useSupabase()
  let { data: { session } } = await supabase.auth.getSession()

  // Jika session sudah kadaluarsa atau hampir kadaluarsa (30 detik), refresh
  if (session?.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
    try {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
      if (!refreshErr && refreshed?.session) {
        session = refreshed.session
      } else {
        session = null
      }
    } catch {
      session = null
    }
  }

  const { currentToken, logout } = useAuth()
  if (session?.access_token) {
    currentToken.value = session.access_token
  } else {
    currentToken.value = null
  }

  const publicRoutes = ['/auth/login', '/auth/register', '/auth/reset-password']
  const isPublicRoute = publicRoutes.some((path) => to.path.startsWith(path))

  if (!session && !isPublicRoute) {
    await logout(false)
    return navigateTo('/auth/login')
  }

  if (session && isPublicRoute) {
    return navigateTo('/beranda')
  }
})
