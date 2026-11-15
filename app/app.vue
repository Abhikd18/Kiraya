<script setup lang="ts">
const { init } = useAuth()
const { loadSaved } = useListings()

// A failed email sign-in link comes back as #error=…&error_description=… (e.g. link expired or already used).
// Read it before any page redirects (which would drop the #…), then send the user to the login page.
const authError = useState<string>('kiraya-auth-error', () => '')
if (import.meta.client && window.location.hash.includes('error_description=')) {
  const params = new URLSearchParams(window.location.hash.slice(1))
  authError.value = params.get('error_code') === 'otp_expired'
    ? 'That login link has expired or was already used. Each link works once, and a newer email cancels older ones. Enter your email to get a fresh link.'
    : (params.get('error_description') || 'Login failed. Please try again.')
  history.replaceState(history.state, '', window.location.pathname + window.location.search)
}

onMounted(() => {
  if (authError.value) navigateTo('/login')
  init()
  loadSaved()
  // Register the service worker so Kiraya can be installed as an app
  if ('serviceWorker' in navigator && !import.meta.dev) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="#ea580c" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
