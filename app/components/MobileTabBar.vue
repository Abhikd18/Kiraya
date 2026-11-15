<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()

const tabs = computed(() => [
  { label: 'Home', to: '/', icon: 'i-lucide-house' },
  { label: 'Search', to: '/rent', icon: 'i-lucide-search' },
  { label: 'Post', to: '/post', icon: 'i-lucide-circle-plus' },
  { label: 'Saved', to: '/saved', icon: 'i-lucide-heart' },
  { label: user.value ? 'Account' : 'Log in', to: user.value ? '/dashboard' : '/login', icon: 'i-lucide-user-round' }
])

function active(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <nav class="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden dark:border-stone-800 dark:bg-stone-950/95">
    <ul class="grid grid-cols-5">
      <li v-for="t in tabs" :key="t.label">
        <NuxtLink
          :to="t.to"
          class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
          :class="active(t.to) ? 'text-orange-600' : 'text-stone-500'"
        >
          <UIcon :name="t.icon" class="size-6" />
          {{ t.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
