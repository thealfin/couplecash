export default defineNuxtRouteMiddleware(async (to) => {
  // Hanya jalankan di client-side untuk menghindari mismatch SSR session
  if (import.meta.server) return

  const supabase = useSupabase()
  const { data: { session } } = await supabase.auth.getSession()

  const publicRoutes = ['/auth/login', '/auth/register', '/auth/reset-password']
  const isPublicRoute = publicRoutes.some((path) => to.path.startsWith(path))

  if (!session && !isPublicRoute) {
    return navigateTo('/auth/login')
  }

  if (session && isPublicRoute) {
    return navigateTo('/beranda')
  }
})
