// Service Worker for CoupleCash PWA (Modern Stale-While-Revalidate & Network-First)
const STATIC_CACHE = 'couplecash-static-v2';
const DYNAMIC_CACHE = 'couplecash-dynamic-v2';

// Core assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/site.webmanifest',
  '/offline.html',
  '/pwa-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png'
];

// 1. Install Event: Precache static assets and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        console.log('[SW] Precaching core static assets');
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(asset);
          } catch (err) {
            console.warn('[SW] Could not precache asset:', asset, err);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean old cache versions & claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting obsolete cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Message Handler for manual skip waiting (update prompt)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. Fetch Event: Routing & Caching Strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP / non-HTTPS (chrome-extension, blob, data URI)
  if (!url.protocol.startsWith('http')) return;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Vite HMR / dev server live reload scripts
  if (
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.searchParams.has('t') ||
    url.pathname.includes('__webpack_hmr')
  ) {
    return;
  }

  // Strategy 1: Stale-While-Revalidate for Static Assets (Images, Fonts, CSS, JS)
  if (
    url.pathname.match(/\.(css|js|woff|woff2|ttf|eot|png|jpg|jpeg|webp|svg|gif|ico)$/i) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Strategy 2: Network-First with Offline Fallback for Navigation & Page Routes
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Explicitly NEVER cache sensitive vault, security, or biometric endpoints
  if (
    url.pathname.startsWith('/api/vault') ||
    url.pathname.startsWith('/api/security')
  ) {
    // Direct network-only fetch, never hit or put into SW cache
    event.respondWith(fetch(request));
    return;
  }

  // Strategy 3: Network-First for general API & Data requests
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co')
  ) {
    event.respondWith(networkFirstData(request));
    return;
  }

  // Default Fallback Strategy
  event.respondWith(networkFirstNavigation(request));
});

// Implementation: Stale-While-Revalidate Strategy
async function staleWhileRevalidate(request) {
  const staticCache = await caches.open(STATIC_CACHE);
  const cachedResponse = await staticCache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (
        networkResponse &&
        networkResponse.status === 200 &&
        (networkResponse.type === 'basic' || networkResponse.type === 'cors')
      ) {
        staticCache.put(request, networkResponse.clone()).catch(() => {});
      }
      return networkResponse;
    })
    .catch((err) => {
      return cachedResponse;
    });

  return cachedResponse || fetchPromise;
}

// Implementation: Network-First Strategy for HTML Navigation with Offline Fallback
async function networkFirstNavigation(request) {
  const dynamicCache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (
      networkResponse &&
      networkResponse.status === 200 &&
      networkResponse.type === 'basic'
    ) {
      dynamicCache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (error) {
    // 1. Try matching this exact route from dynamic or static cache
    const cachedResponse = (await dynamicCache.match(request)) || (await caches.match(request));
    if (cachedResponse) return cachedResponse;

    // 2. Fallback to cached home or offline fallback page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;

    const cachedHome = await caches.match('/');
    if (cachedHome) return cachedHome;

    return new Response('Mode offline aktif. Silakan hubungkan internet Anda.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Implementation: Network-First for API / Data Requests
async function networkFirstData(request) {
  const dynamicCache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);
    const cacheControl = networkResponse?.headers?.get('Cache-Control') || '';
    if (
      networkResponse &&
      networkResponse.status === 200 &&
      !cacheControl.includes('no-store') &&
      !cacheControl.includes('no-cache')
    ) {
      dynamicCache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (error) {
    const cachedData = await dynamicCache.match(request);
    if (cachedData) return cachedData;

    return new Response(JSON.stringify({ offline: true, message: 'Tidak ada koneksi internet' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
