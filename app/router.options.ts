import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    // Email login links put data after the # (#access_token=… or #error=…). Those aren't page anchors.
    if (to.hash && !to.hash.includes('=')) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
}
