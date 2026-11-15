// Loads Leaflet + OpenStreetMap from a CDN only in the browser.
// Free, no API key needed. Swap for Google Maps later if you want.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loading: Promise<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadLeaflet(): Promise<any> {
  if (import.meta.server) return Promise.reject(new Error('Leaflet only runs in the browser'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (w.L) return Promise.resolve(w.L)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.async = true
    s.onload = () => resolve(w.L)
    s.onerror = () => {
      loading = null
      reject(new Error('Could not load the map'))
    }
    document.head.appendChild(s)
  })
  return loading
}

export const TRICITY_CENTER: [number, number] = [30.7046, 76.7179]
