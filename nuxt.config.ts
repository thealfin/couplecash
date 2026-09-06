// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  experimental: {
    appManifest: false,
  },

  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2BucketName: process.env.R2_BUCKET_NAME,
    public: {
      supabaseUrl: 'https://fjgiolmwwpgxesbikjnp.supabase.co',
      supabaseAnonKey: 'sb_publishable_JvAZiu73RiYUQajjCYmbYQ_k8bYB4RO',
    },
  },

  routeRules: {
    '/': { redirect: '/auth/login' },
    '/login': { redirect: '/auth/login' },
    '/register': { redirect: '/auth/register' },
  },

  modules: ['@nuxtjs/tailwindcss'],

  tailwindcss: {
    cssPath: ['~/assets/css/main.css', { injectPosition: 'first' }],
    configPath: 'tailwind.config',
    viewer: false,
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'CoupleCash — Keuangan Keluarga',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
        { name: 'description', content: 'Aplikasi manajemen cash flow pasangan — catat, analisis, dan rencanakan keuangan keluarga bersama.' },
        { name: 'theme-color', content: '#4648d4' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'CoupleCash' },
        { name: 'application-name', content: 'CoupleCash' },
        { name: 'msapplication-TileColor', content: '#4648d4' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'icon', type: 'image/png', href: '/pwa-icon.png' },
        { rel: 'shortcut icon', type: 'image/png', href: '/pwa-icon.png' },
        { rel: 'apple-touch-icon', href: '/pwa-icon.png' },
        { rel: 'apple-touch-icon', sizes: '192x192', href: '/icon-192.png' },
        { rel: 'apple-touch-icon', sizes: '512x512', href: '/icon-512.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
        },
      ],
    },
  },
})
