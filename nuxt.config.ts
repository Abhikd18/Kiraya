// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  fonts: {
    provider: 'local'
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Kiraya – Verified rentals in Chandigarh, Mohali & Panchkula',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Find broker-free flats, PGs and rooms for rent in Chandigarh Tricity. Owners list for free.' },
        { name: 'theme-color', content: '#ea580c' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Kiraya' },
        { property: 'og:title', content: 'Kiraya – Verified rentals in Tricity' },
        { property: 'og:description', content: 'Broker-free flats, PGs and rooms in Chandigarh, Mohali and Panchkula.' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icons/icon.svg' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192.png' }
      ]
    }
  },

  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      siteUrl: 'http://localhost:3000'
    }
  },

  routeRules: {
    '/': { isr: 300 },
    // Cached until the next deploy. (Prerendering these left out their _payload.json on Vercel → 404s in the console.)
    '/terms': { isr: true },
    '/privacy': { isr: true },
    // Pages that depend on the logged-in user or browser storage render in the browser only
    '/post': { ssr: false },
    '/dashboard': { ssr: false },
    '/login': { ssr: false },
    '/saved': { ssr: false },
    '/admin': { ssr: false },
    '/profile': { ssr: false }
  },

  vite: {
    optimizeDeps: {
      include: ['@supabase/supabase-js']
    }
  },

  compatibilityDate: '2026-06-30'
})
