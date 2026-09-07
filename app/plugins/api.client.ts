export default defineNuxtPlugin(() => {
  const { getAuthToken, sessionKickedMessage, logout, getDeviceId } = useAuth()
  const router = useRouter()

  // Intercept global $fetch requests on client side
  const originalFetch = globalThis.$fetch

  globalThis.$fetch = originalFetch.create({
    async onRequest({ request, options }) {
      // Only attach auth to local /api/ requests
      const url = typeof request === 'string' ? request : request.url
      if (url && (url.startsWith('/api/') || url.includes('/api/'))) {
        const token = await getAuthToken()
        if (token) {
          const headers = new Headers(options.headers || {})
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`)
          }
          if (!headers.has('X-Device-Id')) {
            headers.set('X-Device-Id', getDeviceId())
          }
          options.headers = headers
        }
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        // Unauthorized
        console.warn('[api.client] 401 Unauthorized encountered, logging out...')
        await logout(false)
        router.push('/auth/login')
      } else if (response.status === 403 && (response._data?.kicked || response._data?.message?.includes('perangkat lain'))) {
        // Kicked out by another device
        sessionKickedMessage.value =
          response._data?.message ||
          'Sesi Anda telah berakhir karena akun ini sedang aktif di perangkat lain. Silakan masuk menggunakan akun/user lain.'
        await logout(false)
        router.push('/auth/login')
      }
    },
  })
})
