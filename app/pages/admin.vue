<script setup lang="ts">
import type { Listing, ListingStatus } from '#shared/types/listing'
import type { AdminReport, AdminUser } from '~/composables/useAdmin'

useSeoMeta({ title: 'Admin | Kiraya', robots: 'noindex' })

const { user, ready, isAdmin, init } = useAuth()
const hasBackend = useHasBackend()
const admin = useAdmin()
const toast = useToast()

const loading = ref(true)
const listings = ref<Listing[]>([])
const users = ref<AdminUser[]>([])
const reports = ref<AdminReport[]>([])

type Tab = 'overview' | 'listings' | 'users' | 'reports'
const tab = ref<Tab>('overview')

async function load() {
  loading.value = true
  try {
    listings.value = await admin.allListings()
    const [u, r] = await Promise.all([admin.allUsers(listings.value), admin.allReports()])
    users.value = u
    reports.value = r
  } catch (e) {
    toast.add({ title: 'Could not load admin data', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    navigateTo({ path: '/login', query: { next: '/admin' } })
    return
  }
  if (isAdmin.value) await load()
  else loading.value = false
})

// ---------- helpers ----------
function isExpired(l: Listing) {
  return l.status === 'live' && new Date(l.expiresAt).getTime() < Date.now()
}
/** What the listing looks like to the public: an expired "live" listing is hidden. */
function shownStatus(l: Listing): ListingStatus {
  return isExpired(l) ? 'expired' : l.status
}
const statusColor: Record<ListingStatus, 'success' | 'warning' | 'neutral' | 'error' | 'info'> = {
  live: 'success', pending: 'warning', rented: 'info', paused: 'neutral', expired: 'error'
}
const ownerName = (id: string) => users.value.find(u => u.id === id)?.email || id.slice(0, 8)

// ---------- overview ----------
const stats = computed(() => {
  const by = (s: ListingStatus) => listings.value.filter(l => shownStatus(l) === s).length
  return {
    total: listings.value.length,
    live: by('live'),
    paused: by('paused'),
    rented: by('rented'),
    expired: by('expired'),
    unverified: listings.value.filter(l => shownStatus(l) === 'live' && !l.verified).length,
    users: users.value.length,
    blocked: users.value.filter(u => u.blocked).length,
    openReports: reports.value.filter(r => r.status === 'open').length
  }
})

// ---------- listings tab ----------
const listingQuery = ref('')
const listingStatus = ref<'all' | ListingStatus | 'unverified'>('all')
const ownerFilter = ref<string>('')
const statusItems = [
  { label: 'All statuses', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Live, not verified', value: 'unverified' },
  { label: 'Paused', value: 'paused' },
  { label: 'Rented', value: 'rented' },
  { label: 'Expired', value: 'expired' },
  { label: 'Pending', value: 'pending' }
]
const filteredListings = computed(() => {
  const q = listingQuery.value.trim().toLowerCase()
  return listings.value.filter((l) => {
    if (ownerFilter.value && l.ownerId !== ownerFilter.value) return false
    if (listingStatus.value === 'unverified') {
      if (shownStatus(l) !== 'live' || l.verified) return false
    } else if (listingStatus.value !== 'all' && shownStatus(l) !== listingStatus.value) return false
    if (q && ![l.title, l.locality, l.city, l.ownerName, ownerName(l.ownerId)].join(' ').toLowerCase().includes(q)) return false
    return true
  })
})

function showListings(status: typeof listingStatus.value, owner = '') {
  listingStatus.value = status
  ownerFilter.value = owner
  listingQuery.value = ''
  tab.value = 'listings'
}

const busy = ref('')
async function act(key: string, fn: () => Promise<void>, done: string) {
  busy.value = key
  try {
    await fn()
    toast.add({ title: done, color: 'success' })
    await load()
  } catch (e) {
    toast.add({ title: 'Could not update', description: (e as Error).message, color: 'error' })
  } finally {
    busy.value = ''
  }
}

const publish = (l: Listing) => act(l.id, () => admin.setStatus(l.id, 'live'), 'Published for 30 days')
const pause = (l: Listing) => act(l.id, () => admin.setStatus(l.id, 'paused'), 'Listing paused (hidden from search)')
const markRented = (l: Listing) => act(l.id, () => admin.setStatus(l.id, 'rented'), 'Marked as rented')
const toggleVerified = (l: Listing) => act(l.id, () => admin.setVerified(l.id, !l.verified), l.verified ? 'Verified badge removed' : 'Marked as verified')
function del(l: Listing) {
  if (!window.confirm(`Delete "${l.title}" permanently? This can't be undone.`)) return
  act(l.id, () => admin.removeListing(l.id), 'Listing deleted')
}

// ---------- users tab ----------
const userQuery = ref('')
const filteredUsers = computed(() => {
  const q = userQuery.value.trim().toLowerCase()
  return users.value.filter(u => !q || `${u.name} ${u.email}`.toLowerCase().includes(q))
})
function toggleBlocked(u: AdminUser) {
  if (u.id === user.value?.id) {
    toast.add({ title: 'You can\'t block your own account', color: 'warning' })
    return
  }
  if (!u.blocked && !window.confirm(`Block ${u.email}? They won't be able to post, and their live listings will be paused.`)) return
  act(u.id, () => admin.setBlocked(u.id, !u.blocked), u.blocked ? 'User unblocked' : 'User blocked and listings paused')
}

// ---------- reports tab ----------
const reportFilter = ref<'open' | 'all'>('open')
const filteredReports = computed(() => reports.value.filter(r => reportFilter.value === 'all' || r.status === 'open'))
const resolveReport = (r: AdminReport, status: AdminReport['status']) =>
  act(r.id, () => admin.setReportStatus(r.id, status), status === 'resolved' ? 'Report resolved' : 'Report dismissed')
function pauseReported(r: AdminReport) {
  act(r.id, async () => {
    await admin.setStatus(r.listingId, 'paused')
    await admin.setReportStatus(r.id, 'resolved')
  }, 'Listing paused and report resolved')
}

const tabs = computed(() => [
  { value: 'overview' as Tab, label: 'Overview', icon: 'i-lucide-layout-dashboard' },
  { value: 'listings' as Tab, label: `Listings (${listings.value.length})`, icon: 'i-lucide-house' },
  { value: 'users' as Tab, label: `Users (${users.value.length})`, icon: 'i-lucide-users' },
  { value: 'reports' as Tab, label: `Reports${stats.value.openReports ? ` (${stats.value.openReports})` : ''}`, icon: 'i-lucide-flag' }
])
const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <!-- Gatekeeping -->
    <div v-if="!hasBackend" class="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
      <UIcon name="i-lucide-shield" class="mx-auto mb-3 size-10 text-stone-400" />
      <p class="font-semibold">The admin dashboard needs Supabase</p>
      <p class="text-sm text-stone-500">Connect Supabase (see README) to manage listings, users and reports.</p>
    </div>

    <div v-else-if="!ready || !user || loading" class="py-20 text-center text-stone-500">Loading…</div>

    <div v-else-if="!isAdmin" class="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
      <UIcon name="i-lucide-shield-x" class="mx-auto mb-3 size-10 text-stone-400" />
      <p class="font-semibold">Admins only</p>
      <p class="text-sm text-stone-500">Your account ({{ user.email }}) doesn't have admin access.</p>
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="flex items-center gap-2 text-2xl font-bold">
            <UIcon name="i-lucide-shield-check" class="size-6 text-orange-600" /> Admin
          </h1>
          <p class="text-stone-500">Manage every listing, user and report on Kiraya.</p>
        </div>
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="loading" @click="load">Refresh</UButton>
      </div>

      <!-- Tabs -->
      <div class="no-scrollbar mb-6 flex gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
        <button
          v-for="t in tabs"
          :key="t.value"
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition"
          :class="tab === t.value ? 'bg-white text-orange-700 shadow-sm dark:bg-stone-950 dark:text-orange-300' : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'"
          @click="tab = t.value"
        >
          <UIcon :name="t.icon" class="size-4" /> {{ t.label }}
        </button>
      </div>

      <!-- Overview -->
      <div v-if="tab === 'overview'" class="space-y-6">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            v-for="s in [
              { label: 'Live listings', value: stats.live, go: 'live', color: 'text-emerald-600' },
              { label: 'Paused', value: stats.paused, go: 'paused', color: '' },
              { label: 'Rented', value: stats.rented, go: 'rented', color: 'text-sky-600' },
              { label: 'Expired', value: stats.expired, go: 'expired', color: 'text-red-600' }
            ]"
            :key="s.label"
            type="button"
            class="rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900"
            @click="showListings(s.go as ListingStatus)"
          >
            <p class="text-2xl font-bold" :class="s.color">{{ s.value }}</p>
            <p class="text-sm text-stone-500">{{ s.label }}</p>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <p class="text-2xl font-bold">{{ stats.total }}</p><p class="text-sm text-stone-500">All listings</p>
          </div>
          <button type="button" class="rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900" @click="tab = 'users'">
            <p class="text-2xl font-bold">{{ stats.users }}</p><p class="text-sm text-stone-500">Users ({{ stats.blocked }} blocked)</p>
          </button>
          <button type="button" class="rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900" @click="tab = 'reports'">
            <p class="text-2xl font-bold" :class="stats.openReports ? 'text-red-600' : ''">{{ stats.openReports }}</p><p class="text-sm text-stone-500">Open reports</p>
          </button>
          <button type="button" class="rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900" @click="showListings('unverified')">
            <p class="text-2xl font-bold">{{ stats.unverified }}</p><p class="text-sm text-stone-500">Live, not verified</p>
          </button>
        </div>
        <div class="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p class="font-semibold">Needs your attention</p>
          <ul class="mt-1 list-disc pl-5">
            <li v-if="stats.openReports">{{ stats.openReports }} open report(s): check them in the Reports tab.</li>
            <li v-if="stats.unverified">{{ stats.unverified }} live listing(s) without the Verified badge.</li>
            <li v-if="!stats.openReports && !stats.unverified">Nothing right now.</li>
          </ul>
        </div>
      </div>

      <!-- Listings -->
      <div v-else-if="tab === 'listings'" class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <UInput v-model="listingQuery" icon="i-lucide-search" placeholder="Title, area, owner or email" class="w-full sm:w-72" />
          <USelect v-model="listingStatus" :items="statusItems" class="w-full sm:w-52" />
          <UButton v-if="ownerFilter" color="neutral" variant="soft" trailing-icon="i-lucide-x" @click="ownerFilter = ''">
            Owner: {{ ownerName(ownerFilter) }}
          </UButton>
        </div>
        <p class="text-sm text-stone-500">{{ filteredListings.length }} listing(s)</p>

        <div v-if="!filteredListings.length" class="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500 dark:border-stone-700">
          No listings match.
        </div>
        <ul v-else class="space-y-3">
          <li v-for="l in filteredListings" :key="l.id" class="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row dark:border-stone-800 dark:bg-stone-900">
            <NuxtLink :to="`/property/${l.id}`" class="h-24 w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
              <PropertyPhoto :src="l.photos[0]" :type="l.type" :alt="l.title" />
            </NuxtLink>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <UBadge :color="statusColor[shownStatus(l)]" variant="soft" :label="shownStatus(l)" />
                <UBadge v-if="l.verified" color="success" variant="outline" icon="i-lucide-badge-check" label="Verified" />
                <UBadge v-if="l.postedBy === 'broker'" color="warning" variant="outline" label="Broker" />
                <span class="text-xs text-stone-500">{{ l.views }} views · posted {{ date(l.createdAt) }}</span>
              </div>
              <NuxtLink :to="`/property/${l.id}`" class="mt-1 block truncate font-semibold hover:text-orange-600">{{ l.title }}</NuxtLink>
              <p class="text-sm text-stone-500">
                {{ l.locality }}, {{ l.city }} · {{ formatRent(l.rent) }}/month ·
                <button type="button" class="underline hover:text-orange-600" @click="showListings('all', l.ownerId)">{{ l.ownerName }} ({{ ownerName(l.ownerId) }})</button>
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-pencil" :to="`/post?edit=${l.id}`">Edit</UButton>
                <UButton v-if="shownStatus(l) !== 'live'" size="xs" icon="i-lucide-eye" :loading="busy === l.id" @click="publish(l)">Publish</UButton>
                <UButton v-else size="xs" color="neutral" variant="soft" icon="i-lucide-pause" :loading="busy === l.id" @click="pause(l)">Pause</UButton>
                <UButton v-if="shownStatus(l) === 'live'" size="xs" color="info" variant="soft" icon="i-lucide-check" @click="markRented(l)">Mark rented</UButton>
                <UButton size="xs" color="success" variant="soft" :icon="l.verified ? 'i-lucide-badge-x' : 'i-lucide-badge-check'" @click="toggleVerified(l)">
                  {{ l.verified ? 'Remove verified' : 'Verify' }}
                </UButton>
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="del(l)">Delete</UButton>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- Users -->
      <div v-else-if="tab === 'users'" class="space-y-4">
        <UInput v-model="userQuery" icon="i-lucide-search" placeholder="Name or email" class="w-full sm:w-72" />
        <p class="text-sm text-stone-500">
          Everyone who has logged in: tenants, students and owners use the same kind of account.
          To delete an account completely, use Supabase → Authentication → Users.
        </p>
        <ul class="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
          <li v-for="u in filteredUsers" :key="u.id" class="flex flex-wrap items-center justify-between gap-3 p-4">
            <div class="min-w-0">
              <p class="flex flex-wrap items-center gap-2 font-semibold">
                {{ u.name || '(no name)' }}
                <UBadge v-if="u.blocked" color="error" variant="soft" label="Blocked" />
                <UBadge v-if="u.id === user.id" color="primary" variant="soft" label="You" />
              </p>
              <p class="truncate text-sm text-stone-500">{{ u.email }} · joined {{ date(u.createdAt) }}</p>
              <p class="text-sm text-stone-500">{{ u.live }} live / {{ u.listings }} listing(s)</p>
            </div>
            <div class="flex gap-2">
              <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-house" :disabled="!u.listings" @click="showListings('all', u.id)">Listings</UButton>
              <UButton
                size="xs"
                :color="u.blocked ? 'success' : 'error'"
                variant="soft"
                :icon="u.blocked ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                :loading="busy === u.id"
                @click="toggleBlocked(u)"
              >
                {{ u.blocked ? 'Unblock' : 'Block' }}
              </UButton>
            </div>
          </li>
          <li v-if="!filteredUsers.length" class="p-6 text-center text-sm text-stone-500">No users found.</li>
        </ul>
      </div>

      <!-- Reports -->
      <div v-else class="space-y-4">
        <div class="flex gap-2">
          <UButton size="sm" :variant="reportFilter === 'open' ? 'solid' : 'outline'" :color="reportFilter === 'open' ? 'primary' : 'neutral'" @click="reportFilter = 'open'">Open</UButton>
          <UButton size="sm" :variant="reportFilter === 'all' ? 'solid' : 'outline'" :color="reportFilter === 'all' ? 'primary' : 'neutral'" @click="reportFilter = 'all'">All</UButton>
        </div>
        <div v-if="!filteredReports.length" class="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500 dark:border-stone-700">
          No {{ reportFilter === 'open' ? 'open ' : '' }}reports.
        </div>
        <ul v-else class="space-y-3">
          <li v-for="r in filteredReports" :key="r.id" class="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="r.status === 'open' ? 'error' : 'neutral'" variant="soft" :label="r.status" />
              <span class="font-semibold">{{ r.reason }}</span>
              <span class="text-xs text-stone-500">{{ date(r.createdAt) }}</span>
            </div>
            <p class="mt-1 text-sm text-stone-500">
              Listing:
              <NuxtLink :to="`/property/${r.listingId}`" class="underline hover:text-orange-600">{{ r.listingTitle }}</NuxtLink>
              <template v-if="r.listingStatus"> ({{ r.listingStatus }})</template>
            </p>
            <div v-if="r.status === 'open'" class="mt-3 flex flex-wrap gap-2">
              <UButton v-if="r.listingStatus === 'live'" size="xs" color="error" variant="soft" icon="i-lucide-pause" :loading="busy === r.id" @click="pauseReported(r)">Pause listing</UButton>
              <UButton size="xs" color="success" variant="soft" icon="i-lucide-check" @click="resolveReport(r, 'resolved')">Resolved</UButton>
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="resolveReport(r, 'dismissed')">Dismiss</UButton>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
