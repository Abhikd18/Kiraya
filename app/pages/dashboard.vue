<script setup lang="ts">
import type { Listing, ListingStatus } from '#shared/types/listing'

useSeoMeta({ title: 'My listings | Kiraya' })

const { user, ready, init, signOut } = useAuth()
const { mine, setStatus, remove } = useListings()
const toast = useToast()

const listings = ref<Listing[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    listings.value = await mine()
  } catch (e) {
    toast.add({ title: 'Could not load your listings', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    navigateTo({ path: '/login', query: { next: '/dashboard' } })
    return
  }
  await load()
})

const statusColor: Record<ListingStatus, 'success' | 'warning' | 'neutral' | 'error' | 'info'> = {
  live: 'success',
  pending: 'warning',
  rented: 'info',
  paused: 'neutral',
  expired: 'error'
}

function isExpired(l: Listing) {
  return new Date(l.expiresAt).getTime() < Date.now()
}

async function change(l: Listing, status: ListingStatus) {
  try {
    await setStatus(l.id, status)
    toast.add({ title: status === 'live' ? 'Listing is live for 30 more days' : `Marked as ${status}`, color: 'success' })
    await load()
  } catch (e) {
    toast.add({ title: 'Could not update', description: (e as Error).message, color: 'error' })
  }
}

async function del(l: Listing) {
  if (!window.confirm(`Delete "${l.title}"? This can't be undone.`)) return
  try {
    await remove(l.id)
    await load()
  } catch (e) {
    toast.add({ title: 'Could not delete', description: (e as Error).message, color: 'error' })
  }
}

async function logout() {
  await signOut()
  await navigateTo('/')
}

const stats = computed(() => ({
  live: listings.value.filter(l => l.status === 'live' && !isExpired(l)).length,
  views: listings.value.reduce((s, l) => s + (l.views || 0), 0),
  rented: listings.value.filter(l => l.status === 'rented').length
}))
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <div v-if="!ready || !user" class="py-20 text-center text-stone-500">Loading…</div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">Hi {{ user.name.split(' ')[0] }}</h1>
          <p class="text-stone-500">{{ user.email || 'Manage your properties here' }}</p>
        </div>
        <div class="flex gap-2">
          <UButton to="/post" icon="i-lucide-plus">Post property</UButton>
          <UButton color="neutral" variant="outline" icon="i-lucide-log-out" @click="logout">Log out</UButton>
        </div>
      </div>

      <div class="mb-6 grid grid-cols-3 gap-3">
        <div class="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p class="text-2xl font-bold">{{ stats.live }}</p><p class="text-sm text-stone-500">Live listings</p>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p class="text-2xl font-bold">{{ stats.views }}</p><p class="text-sm text-stone-500">Total views</p>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p class="text-2xl font-bold">{{ stats.rented }}</p><p class="text-sm text-stone-500">Rented out</p>
        </div>
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 2" :key="i" class="h-28 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
      </div>

      <div v-else-if="!listings.length" class="rounded-2xl border border-dashed border-stone-300 p-12 text-center dark:border-stone-700">
        <UIcon name="i-lucide-house-plus" class="mx-auto mb-3 size-10 text-orange-600" />
        <p class="font-semibold">You haven't posted any property yet</p>
        <p class="mb-4 text-sm text-stone-500">It's free and takes about 5 minutes.</p>
        <UButton to="/post">Post your first property</UButton>
      </div>

      <ul v-else class="space-y-3">
        <li v-for="l in listings" :key="l.id" class="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row dark:border-stone-800 dark:bg-stone-900">
          <NuxtLink :to="`/property/${l.id}`" class="h-28 w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
            <PropertyPhoto :src="l.photos[0]" :type="l.type" :alt="l.title" />
          </NuxtLink>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="isExpired(l) && l.status === 'live' ? 'error' : statusColor[l.status]" variant="soft" :label="isExpired(l) && l.status === 'live' ? 'expired' : l.status" />
              <span class="text-xs text-stone-500">{{ l.views }} views · posted {{ timeAgo(l.createdAt).toLowerCase() }}</span>
            </div>
            <NuxtLink :to="`/property/${l.id}`" class="mt-1 block truncate font-semibold hover:text-orange-600">{{ l.title }}</NuxtLink>
            <p class="text-sm text-stone-500">{{ l.locality }}, {{ l.city }} · {{ formatRent(l.rent) }}/month</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <UButton v-if="l.status !== 'live' || isExpired(l)" size="xs" icon="i-lucide-refresh-cw" @click="change(l, 'live')">Make live (30 days)</UButton>
              <UButton v-if="l.status === 'live' && !isExpired(l)" size="xs" color="info" variant="soft" icon="i-lucide-check" @click="change(l, 'rented')">Mark as rented</UButton>
              <UButton v-if="l.status === 'live' && !isExpired(l)" size="xs" color="neutral" variant="soft" icon="i-lucide-pause" @click="change(l, 'paused')">Pause</UButton>
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="del(l)">Delete</UButton>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>
