// Kiraya service worker: makes the site installable and keeps it usable on weak mobile networks.
const VERSION = 'kiraya-v1'
const OFFLINE_URLS = ['/', '/rent', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Never cache login, database or map-tile requests
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  // Built JS/CSS/images: cache first
  if (url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(VERSION).then(cache => cache.put(req, copy))
        return res
      }))
    )
    return
  }

  // Pages: network first, fall back to cache when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(VERSION).then(cache => cache.put(req, copy))
        return res
      }).catch(() => caches.match(req).then(hit => hit || caches.match('/')))
    )
  }
})
