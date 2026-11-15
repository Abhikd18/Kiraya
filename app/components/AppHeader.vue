<script setup lang="ts">
const { user, signOut } = useAuth()
const route = useRoute()

const links = [
  { label: 'Find a home', to: '/rent' },
  { label: 'Saved', to: '/saved' },
  { label: 'My listings', to: '/dashboard' }
]

async function logout() {
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
      <KirayaLogo />

      <nav class="hidden items-center gap-1 md:flex">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-stone-100 dark:hover:bg-stone-800"
          :class="route.path.startsWith(l.to) ? 'text-orange-600' : 'text-stone-600 dark:text-stone-300'"
        >
          {{ l.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-2">
        <UButton to="/post" icon="i-lucide-plus" class="hidden sm:inline-flex">
          Post property · Free
        </UButton>
        <UButton to="/post" icon="i-lucide-plus" class="sm:hidden" size="sm">
          Post
        </UButton>
        <template v-if="user">
          <UButton color="neutral" variant="ghost" icon="i-lucide-log-out" class="hidden md:inline-flex" @click="logout">
            {{ user.name.split(' ')[0] }}
          </UButton>
        </template>
        <UButton v-else to="/login" color="neutral" variant="outline" class="hidden md:inline-flex">
          Log in
        </UButton>
      </div>
    </div>
  </header>
</template>
