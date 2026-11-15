<script setup lang="ts">
const { init } = useAuth()
const { loadSaved } = useListings()

onMounted(() => {
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
