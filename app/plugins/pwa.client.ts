// Service Worker Registration & PWA State Plugin for CoupleCash PWA
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  const { setOnline } = useNetwork()

  // 1. Listen for online/offline events in real time
  window.addEventListener('online', () => {
    console.log('[PWA] Network status: ONLINE')
    setOnline(true)
  })

  window.addEventListener('offline', () => {
    console.log('[PWA] Network status: OFFLINE')
    setOnline(false)
  })

  // Initialize status on start
  setOnline(navigator.onLine)

  // 2. Listen for beforeinstallprompt early and store globally
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    ;(window as any).__deferredPwaPrompt = e
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready', { detail: e }))
    console.log('[PWA] beforeinstallprompt event captured and ready')
  })

  if (!('serviceWorker' in navigator)) return

  // 3. In Development Mode, unregister any active service workers so Vite HMR dev server runs smoothly
  if (import.meta.dev) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
        console.log('[PWA] Unregistered ServiceWorker in dev mode for smooth Vite HMR')
      }
    })
    return
  }

  // 4. In Production Mode, register ServiceWorker
  const registerSW = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      console.log('[PWA] Service Worker terdaftar dengan scope:', registration.scope)

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Versi baru tersedia. Mengaktifkan Service Worker...')
              registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        }
      })

      // Handle controller change (seamless reload on update)
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          console.log('[PWA] Service Worker aktif. Merefresh halaman...')
          window.location.reload()
        }
      })
    } catch (err) {
      console.error('[PWA] Gagal mendaftarkan Service Worker:', err)
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW()
  } else {
    window.addEventListener('load', registerSW)
  }
})
