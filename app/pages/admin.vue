<script setup lang="ts">
import type { Listing, ListingStatus } from '#shared/types/listing'
import type { AdminReport, AdminUser } from '~/composables/useAdmin'
import { DB_UPDATE_HELP } from '~/composables/useAdmin'

useSeoMeta({ title: 'Admin | Kiraya', robots: 'noindex' })

const { user, ready, isAdmin, init } = useAuth()
const hasBackend = useHasBackend()
const admin = useAdmin()
const toast = useToast()

const loading = ref(true)
const loadedAt = ref<Date | null>(null)
const loadErrors = ref<string[]>([])
const listings = ref<Listing[]>([])
const users = ref<AdminUser[]>([])
const reports = ref<AdminReport[]>([])

type Tab = 'overview' | 'listings' | 'users' | 'reports'
const tab = ref<Tab>('overview')

/** Each part loads on its own, so one problem doesn't hide the rest of the dashboard. */
async function load() {
  loading.value = true
  const errors: string[] = []
  const [l, r] = await Promise.allSettled([admin.allListings(), admin.allReports()])
  if (l.status === 'fulfilled') listings.value = l.value
  else errors.push(`Listings: ${(l.reason as Error).message}`)
  if (r.status === 'fulfilled') reports.value = r.value
  else errors.push(`Reports: ${(r.reason as Error).message}`)
  try {
    users.value = await admin.allUsers(listings.value)
  } catch (e) {
    errors.push(`Users: ${(e as Error).message}`)
  }
  loadErrors.value = errors
  loadedAt.value = new Date()
  loading.value = false
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
const DAY = 86400000
const shownStatus = (l: Listing): ListingStatus =>
  l.status === 'live' && new Date(l.expiresAt).getTime() < Date.now() ? 'expired' : l.status
const userById = (id: string) => users.value.find(u => u.id === id)
const ownerLabel = (l: Listing) => userById(l.ownerId)?.email || l.ownerName
const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 7 * DAY

// ---------- numbers ----------
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
    openReports: reports.value.filter(r => r.status === 'open').length,
    newListings: listings.value.filter(l => isNew(l.createdAt)).length,
    newUsers: users.value.filter(u => isNew(u.createdAt)).length,
    views: listings.value.reduce((s, l) => s + (l.views || 0), 0)
  }
})

const byCity = computed(() => {
  const live = listings.value.filter(l => shownStatus(l) === 'live')
  const max = Math.max(1, ...CITIES.map(c => live.filter(l => l.city === c).length))
  return CITIES.map(c => ({ label: c, count: live.filter(l => l.city === c).length, pct: 0, max }))
    .map(x => ({ ...x, pct: Math.round((x.count / max) * 100) }))
})
const byRole = computed(() => {
  const rows = [...USER_ROLES.map(r => ({ value: r.value, label: r.label })), { value: '', label: 'Not set' }]
    .map(r => ({ ...r, count: users.value.filter(u => (u.role || '') === r.value).length }))
  const max = Math.max(1, ...rows.map(r => r.count))
  return rows.map(r => ({ ...r, pct: Math.round((r.count / max) * 100) }))
})

const latestListings = computed(() => listings.value.slice(0, 5))
const newestUsers = computed(() => users.value.slice(0, 5))
const openReports = computed(() => reports.value.filter(r => r.status === 'open'))

const attention = computed(() => [
  { show: stats.value.openReports > 0, icon: 'i-lucide-flag', color: 'text-red-600', text: `${stats.value.openReports} open report(s) to check`, action: 'Review', go: () => { reportFilter.value = 'open'; tab.value = 'reports' } },
  { show: stats.value.unverified > 0, icon: 'i-lucide-badge-check', color: 'text-emerald-600', text: `${stats.value.unverified} live listing(s) without the Verified badge`, action: 'Show', go: () => showListings('unverified') },
  { show: stats.value.expired > 0, icon: 'i-lucide-clock', color: 'text-amber-600', text: `${stats.value.expired} listing(s) expired (hidden from search)`, action: 'Show', go: () => showListings('expired') }
].filter(a => a.show))

// ---------- actions (shared by every tab) ----------
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
function toggleBlocked(u: AdminUser) {
  if (u.id === user.value?.id) {
    toast.add({ title: 'You can\'t block your own account', color: 'warning' })
    return
  }
  if (!u.blocked && !window.confirm(`Block ${u.email}? They won't be able to post, and their live listings will be paused.`)) return
  act(u.id, () => admin.setBlocked(u.id, !u.blocked), u.blocked ? 'User unblocked' : 'User blocked and listings paused')
}

// ---------- listings tab ----------
const listingQuery = ref('')
const listingStatus = ref<'all' | ListingStatus | 'unverified'>('all')
const listingSort = ref<'newest' | 'oldest' | 'views' | 'rent'>('newest')
const ownerFilter = ref('')
const statusItems = [
  { label: 'All statuses', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Live, not verified', value: 'unverified' },
  { label: 'Paused', value: 'paused' },
  { label: 'Rented', value: 'rented' },
  { label: 'Expired', value: 'expired' },
  { label: 'Pending', value: 'pending' }
]
const sortItems = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Most viewed', value: 'views' },
  { label: 'Highest rent', value: 'rent' }
]
const filteredListings = computed(() => {
  const q = listingQuery.value.trim().toLowerCase()
  const out = listings.value.filter((l) => {
    if (ownerFilter.value && l.ownerId !== ownerFilter.value) return false
    if (listingStatus.value === 'unverified') {
      if (shownStatus(l) !== 'live' || l.verified) return false
    } else if (listingStatus.value !== 'all' && shownStatus(l) !== listingStatus.value) return false
    if (q && ![l.title, l.locality, l.city, l.ownerName, ownerLabel(l)].join(' ').toLowerCase().includes(q)) return false
    return true
  })
  if (listingSort.value === 'oldest') out.reverse()
  if (listingSort.value === 'views') out.sort((a, b) => b.views - a.views)
  if (listingSort.value === 'rent') out.sort((a, b) => b.rent - a.rent)
  return out
})
function showListings(status: typeof listingStatus.value, owner = '') {
  listingStatus.value = status
  ownerFilter.value = owner
  listingQuery.value = ''
  tab.value = 'listings'
}

// ---------- users tab ----------
const userQuery = ref('')
const userRole = ref('all')
const openUser = ref('')
const roleItems = [
  { label: 'Everyone', value: 'all' },
  ...USER_ROLES.map(r => ({ label: r.label, value: r.value })),
  { label: 'Role not set', value: 'none' },
  { label: 'Blocked', value: 'blocked' }
]
const filteredUsers = computed(() => {
  const q = userQuery.value.trim().toLowerCase()
  return users.value.filter((u) => {
    if (userRole.value === 'blocked') {
      if (!u.blocked) return false
    } else if (userRole.value === 'none' ? u.role : userRole.value !== 'all' && u.role !== userRole.value) return false
    return !q || `${u.name} ${u.email} ${u.phone} ${u.city}`.toLowerCase().includes(q)
  })
})
const listingsOf = (id: string) => listings.value.filter(l => l.ownerId === id)
function showUser(id: string) {
  openUser.value = id
  userQuery.value = ''
  userRole.value = 'all'
  tab.value = 'users'
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
  { value: 'overview' as Tab, label: 'Overview', icon: 'i-lucide-layout-dashboard', count: 0 },
  { value: 'listings' as Tab, label: 'Listings', icon: 'i-lucide-house', count: listings.value.length },
  { value: 'users' as Tab, label: 'Users', icon: 'i-lucide-users', count: users.value.length },
  { value: 'reports' as Tab, label: 'Reports', icon: 'i-lucide-flag', count: stats.value.openReports }
])
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6">
    <!-- Gatekeeping -->
    <div v-if="!hasBackend" class="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
      <UIcon name="i-lucide-shield" class="mx-auto mb-3 size-10 text-stone-400" />
      <p class="font-semibold">The admin dashboard needs Supabase</p>
      <p class="text-sm text-stone-500">Connect Supabase (see README) to manage listings, users and reports.</p>
    </div>

    <div v-else-if="!ready || !user || (loading && !loadedAt)" class="py-20 text-center text-stone-500">Loading…</div>

    <div v-else-if="!isAdmin" class="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
      <UIcon name="i-lucide-shield-x" class="mx-auto mb-3 size-10 text-stone-400" />
      <p class="font-semibold">Admins only</p>
      <p class="text-sm text-stone-500">Your account ({{ user.email }}) doesn't have admin access.</p>
    </div>

    <div v-else class="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      <!-- Sidebar (desktop) / tabs (phone) -->
      <aside class="mb-6 lg:mb-0">
        <div class="mb-4 hidden lg:block">
          <p class="flex items-center gap-2 text-lg font-bold">
            <UIcon name="i-lucide-shield-check" class="size-5 text-orange-600" /> Admin
          </p>
          <p class="text-xs text-stone-500">{{ user.email }}</p>
        </div>
        <nav class="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1 lg:flex-col lg:bg-transparent lg:p-0 dark:bg-stone-800 lg:dark:bg-transparent">
          <button
            v-for="t in tabs"
            :key="t.value"
            type="button"
            class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="tab === t.value ? 'bg-white text-orange-700 shadow-sm dark:bg-stone-900 dark:text-orange-300' : 'text-stone-600 hover:bg-white/60 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white'"
            @click="tab = t.value"
          >
            <UIcon :name="t.icon" class="size-4" />
            {{ t.label }}
            <span v-if="t.count" class="ml-auto rounded-full px-1.5 text-xs" :class="t.value === 'reports' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'">{{ t.count }}</span>
          </button>
        </nav>
        <div class="mt-4 hidden space-y-2 lg:block">
          <UButton block color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="loading" @click="load">Refresh</UButton>
          <p v-if="loadedAt" class="text-center text-xs text-stone-400">Updated {{ loadedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }}</p>
        </div>
      </aside>

      <div class="min-w-0 space-y-6">
        <!-- Problems -->
        <div v-if="admin.dbOutdated.value" class="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <UIcon name="i-lucide-database" class="mt-0.5 size-5 shrink-0" />
          <div>
            <p class="font-semibold">Database update needed</p>
            <p>{{ DB_UPDATE_HELP }} Until then, users can't save their profile and roles/cities aren't shown.</p>
          </div>
        </div>
        <div v-if="loadErrors.length" class="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          <p class="font-semibold">Some data could not be loaded</p>
          <ul class="mt-1 list-disc pl-5">
            <li v-for="e in loadErrors" :key="e">{{ e }}</li>
          </ul>
        </div>

        <div class="flex items-center justify-between gap-3 lg:hidden">
          <h1 class="flex items-center gap-2 text-2xl font-bold"><UIcon name="i-lucide-shield-check" class="size-6 text-orange-600" /> Admin</h1>
          <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-refresh-cw" :loading="loading" @click="load">Refresh</UButton>
        </div>

        <!-- ================= Overview ================= -->
        <template v-if="tab === 'overview'">
          <h2 class="hidden text-2xl font-bold lg:block">Overview</h2>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              v-for="s in [
                { label: 'Live listings', value: stats.live, go: 'live', color: 'text-emerald-600', icon: 'i-lucide-eye' },
                { label: 'Paused', value: stats.paused, go: 'paused', color: 'text-stone-700 dark:text-stone-200', icon: 'i-lucide-pause' },
                { label: 'Rented', value: stats.rented, go: 'rented', color: 'text-sky-600', icon: 'i-lucide-key-round' },
                { label: 'Expired', value: stats.expired, go: 'expired', color: 'text-red-600', icon: 'i-lucide-clock' }
              ]"
              :key="s.label"
              type="button"
              class="rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900"
              @click="showListings(s.go as ListingStatus)"
            >
              <UIcon :name="s.icon" class="mb-2 size-5 text-stone-400" />
              <p class="text-3xl font-bold" :class="s.color">{{ s.value }}</p>
              <p class="text-sm text-stone-500">{{ s.label }}</p>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button type="button" class="rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900" @click="tab = 'users'">
              <p class="text-2xl font-bold">{{ stats.users }}</p>
              <p class="text-sm text-stone-500">Users<span v-if="stats.blocked"> · {{ stats.blocked }} blocked</span></p>
              <p v-if="stats.newUsers" class="mt-1 text-xs font-medium text-emerald-600">+{{ stats.newUsers }} this week</p>
            </button>
            <button type="button" class="rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900" @click="showListings('all')">
              <p class="text-2xl font-bold">{{ stats.total }}</p>
              <p class="text-sm text-stone-500">All listings</p>
              <p v-if="stats.newListings" class="mt-1 text-xs font-medium text-emerald-600">+{{ stats.newListings }} this week</p>
            </button>
            <button type="button" class="rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900" @click="tab = 'reports'">
              <p class="text-2xl font-bold" :class="stats.openReports ? 'text-red-600' : ''">{{ stats.openReports }}</p>
              <p class="text-sm text-stone-500">Open reports</p>
            </button>
            <div class="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <p class="text-2xl font-bold">{{ stats.views.toLocaleString('en-IN') }}</p>
              <p class="text-sm text-stone-500">Listing views</p>
            </div>
          </div>

          <!-- Needs attention -->
          <section class="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h3 class="mb-3 font-semibold">Needs your attention</h3>
            <ul v-if="attention.length" class="divide-y divide-stone-100 dark:divide-stone-800">
              <li v-for="a in attention" :key="a.text" class="flex items-center justify-between gap-3 py-2.5">
                <span class="flex items-center gap-2 text-sm"><UIcon :name="a.icon" class="size-4 shrink-0" :class="a.color" /> {{ a.text }}</span>
                <UButton size="xs" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-right" @click="a.go()">{{ a.action }}</UButton>
              </li>
            </ul>
            <p v-else class="flex items-center gap-2 text-sm text-emerald-600"><UIcon name="i-lucide-circle-check" class="size-4" /> All clear. Nothing needs your attention.</p>
          </section>

          <div class="grid gap-6 xl:grid-cols-2">
            <!-- Latest listings -->
            <section class="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="font-semibold">Latest listings</h3>
                <UButton size="xs" variant="link" color="neutral" trailing-icon="i-lucide-arrow-right" @click="showListings('all')">All listings</UButton>
              </div>
              <ul v-if="latestListings.length" class="space-y-4">
                <li v-for="l in latestListings" :key="l.id">
                  <AdminListingRow
                    :listing="l" compact :owner="ownerLabel(l)" :busy="busy === l.id"
                    @publish="publish(l)" @pause="pause(l)" @rented="markRented(l)" @verify="toggleVerified(l)" @delete="del(l)" @owner="showUser(l.ownerId)"
                  />
                </li>
              </ul>
              <p v-else class="text-sm text-stone-500">No listings yet.</p>
            </section>

            <!-- Newest users -->
            <section class="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="font-semibold">Newest users</h3>
                <UButton size="xs" variant="link" color="neutral" trailing-icon="i-lucide-arrow-right" @click="tab = 'users'">All users</UButton>
              </div>
              <ul v-if="newestUsers.length" class="divide-y divide-stone-100 dark:divide-stone-800">
                <li v-for="u in newestUsers" :key="u.id" class="flex items-center justify-between gap-3 py-2.5">
                  <button type="button" class="min-w-0 text-left" @click="showUser(u.id)">
                    <p class="flex items-center gap-1.5 truncate text-sm font-semibold hover:text-orange-600">
                      {{ u.name || '(no name)' }}
                      <UBadge v-if="u.role" size="sm" color="neutral" variant="outline" :label="roleLabel(u.role)" />
                      <UBadge v-if="u.blocked" size="sm" color="error" variant="soft" label="Blocked" />
                    </p>
                    <p class="truncate text-xs text-stone-500">{{ u.email }} · {{ date(u.createdAt) }} · {{ u.listings }} listing(s)</p>
                  </button>
                  <UButton
                    v-if="u.id !== user.id"
                    size="xs" :color="u.blocked ? 'success' : 'error'" variant="soft" :loading="busy === u.id"
                    @click="toggleBlocked(u)"
                  >
                    {{ u.blocked ? 'Unblock' : 'Block' }}
                  </UButton>
                </li>
              </ul>
              <p v-else class="text-sm text-stone-500">No users yet.</p>
            </section>

            <!-- Listings by city -->
            <section class="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h3 class="mb-3 font-semibold">Live listings by city</h3>
              <ul class="space-y-2">
                <li v-for="c in byCity" :key="c.label">
                  <button type="button" class="grid w-full grid-cols-[110px_1fr_2rem] items-center gap-3 text-left text-sm" @click="listingQuery = c.label; listingStatus = 'live'; ownerFilter = ''; tab = 'listings'">
                    <span class="truncate text-stone-600 dark:text-stone-300">{{ c.label }}</span>
                    <span class="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"><span class="block h-full rounded-full bg-orange-500" :style="{ width: c.pct + '%' }" /></span>
                    <span class="text-right font-medium tabular-nums">{{ c.count }}</span>
                  </button>
                </li>
              </ul>
            </section>

            <!-- Users by role -->
            <section class="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <h3 class="mb-3 font-semibold">Users by role</h3>
              <ul class="space-y-2">
                <li v-for="r in byRole" :key="r.label">
                  <button type="button" class="grid w-full grid-cols-[110px_1fr_2rem] items-center gap-3 text-left text-sm" @click="userRole = r.value || 'none'; openUser = ''; tab = 'users'">
                    <span class="truncate text-stone-600 dark:text-stone-300">{{ r.label }}</span>
                    <span class="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"><span class="block h-full rounded-full bg-sky-500" :style="{ width: r.pct + '%' }" /></span>
                    <span class="text-right font-medium tabular-nums">{{ r.count }}</span>
                  </button>
                </li>
              </ul>
            </section>
          </div>

          <!-- Open reports preview -->
          <section v-if="openReports.length" class="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-stone-900">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="font-semibold">Open reports</h3>
              <UButton size="xs" variant="link" color="neutral" trailing-icon="i-lucide-arrow-right" @click="tab = 'reports'">All reports</UButton>
            </div>
            <ul class="divide-y divide-stone-100 dark:divide-stone-800">
              <li v-for="r in openReports.slice(0, 3)" :key="r.id" class="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div class="min-w-0 text-sm">
                  <p class="font-semibold">{{ r.reason }}</p>
                  <NuxtLink :to="`/property/${r.listingId}`" class="truncate text-stone-500 underline hover:text-orange-600">{{ r.listingTitle }}</NuxtLink>
                </div>
                <div class="flex gap-1.5">
                  <UButton v-if="r.listingStatus === 'live'" size="xs" color="error" variant="soft" icon="i-lucide-pause" :loading="busy === r.id" @click="pauseReported(r)">Pause listing</UButton>
                  <UButton size="xs" color="neutral" variant="ghost" @click="resolveReport(r, 'dismissed')">Dismiss</UButton>
                </div>
              </li>
            </ul>
          </section>
        </template>

        <!-- ================= Listings ================= -->
        <template v-else-if="tab === 'listings'">
          <h2 class="hidden text-2xl font-bold lg:block">Listings</h2>
          <div class="flex flex-wrap gap-2">
            <UInput v-model="listingQuery" icon="i-lucide-search" placeholder="Title, area, city, owner or email" class="w-full sm:w-72" />
            <USelect v-model="listingStatus" :items="statusItems" class="w-full sm:w-48" />
            <USelect v-model="listingSort" :items="sortItems" class="w-full sm:w-40" />
            <UButton v-if="ownerFilter" color="neutral" variant="soft" trailing-icon="i-lucide-x" @click="ownerFilter = ''">
              Owner: {{ userById(ownerFilter)?.email || 'selected user' }}
            </UButton>
          </div>
          <p class="text-sm text-stone-500">{{ filteredListings.length }} listing(s)</p>
          <div v-if="!filteredListings.length" class="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500 dark:border-stone-700">
            No listings match.
          </div>
          <ul v-else class="space-y-3">
            <li v-for="l in filteredListings" :key="l.id" class="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <AdminListingRow
                :listing="l" :owner="ownerLabel(l)" :busy="busy === l.id"
                @publish="publish(l)" @pause="pause(l)" @rented="markRented(l)" @verify="toggleVerified(l)" @delete="del(l)" @owner="showUser(l.ownerId)"
              />
            </li>
          </ul>
        </template>

        <!-- ================= Users ================= -->
        <template v-else-if="tab === 'users'">
          <h2 class="hidden text-2xl font-bold lg:block">Users</h2>
          <div class="flex flex-wrap gap-2">
            <UInput v-model="userQuery" icon="i-lucide-search" placeholder="Name, email, phone or city" class="w-full sm:w-72" />
            <USelect v-model="userRole" :items="roleItems" class="w-full sm:w-48" />
          </div>
          <p class="text-sm text-stone-500">
            {{ filteredUsers.length }} user(s). Tap a user to see their details and listings. Deleting an account completely is done in Supabase → Authentication → Users.
          </p>
          <ul class="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
            <li v-for="u in filteredUsers" :key="u.id">
              <button type="button" class="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50" :aria-expanded="openUser === u.id" @click="openUser = openUser === u.id ? '' : u.id">
                <span class="flex min-w-0 items-center gap-3">
                  <span class="grid size-10 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">{{ (u.name || u.email || '?').charAt(0).toUpperCase() }}</span>
                  <span class="min-w-0">
                    <span class="flex flex-wrap items-center gap-1.5 font-semibold">
                      {{ u.name || '(no name)' }}
                      <UBadge v-if="u.role" size="sm" color="neutral" variant="outline" :label="roleLabel(u.role)" />
                      <UBadge v-if="u.blocked" size="sm" color="error" variant="soft" label="Blocked" />
                      <UBadge v-if="u.id === user.id" size="sm" color="primary" variant="soft" label="You" />
                      <UBadge v-if="isNew(u.createdAt)" size="sm" color="success" variant="soft" label="New" />
                    </span>
                    <span class="block truncate text-sm text-stone-500">{{ u.email }} · {{ u.live }} live / {{ u.listings }} listing(s)</span>
                  </span>
                </span>
                <UIcon :name="openUser === u.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-5 shrink-0 text-stone-400" />
              </button>

              <!-- User details: everything about this user in one place -->
              <div v-if="openUser === u.id" class="space-y-4 border-t border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/50">
                <dl class="grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt class="text-stone-500">Email</dt><dd class="break-all font-medium">{{ u.email || '—' }}</dd></div>
                  <div><dt class="text-stone-500">Mobile</dt><dd class="font-medium">{{ u.phone || '—' }}</dd></div>
                  <div><dt class="text-stone-500">Role</dt><dd class="font-medium">{{ roleLabel(u.role) || 'Not set' }}</dd></div>
                  <div><dt class="text-stone-500">City</dt><dd class="font-medium">{{ u.city || '—' }}</dd></div>
                  <div><dt class="text-stone-500">Joined</dt><dd class="font-medium">{{ date(u.createdAt) }}</dd></div>
                  <div><dt class="text-stone-500">Status</dt><dd class="font-medium" :class="u.blocked ? 'text-red-600' : 'text-emerald-600'">{{ u.blocked ? 'Blocked' : 'Active' }}</dd></div>
                </dl>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-if="u.id !== user.id"
                    size="sm" :color="u.blocked ? 'success' : 'error'" variant="soft"
                    :icon="u.blocked ? 'i-lucide-user-check' : 'i-lucide-user-x'" :loading="busy === u.id"
                    @click="toggleBlocked(u)"
                  >
                    {{ u.blocked ? 'Unblock user' : 'Block user' }}
                  </UButton>
                  <UButton v-if="u.phone" size="sm" color="neutral" variant="outline" icon="i-lucide-phone" :to="`tel:${u.phone}`">Call</UButton>
                  <UButton v-if="u.email" size="sm" color="neutral" variant="outline" icon="i-lucide-mail" :to="`mailto:${u.email}`">Email</UButton>
                  <UButton v-if="u.listings" size="sm" color="neutral" variant="outline" icon="i-lucide-house" @click="showListings('all', u.id)">Open in Listings</UButton>
                </div>
                <div>
                  <p class="mb-2 text-sm font-semibold">Their listings ({{ listingsOf(u.id).length }})</p>
                  <ul v-if="listingsOf(u.id).length" class="space-y-3">
                    <li v-for="l in listingsOf(u.id)" :key="l.id" class="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                      <AdminListingRow
                        :listing="l" compact :busy="busy === l.id"
                        @publish="publish(l)" @pause="pause(l)" @rented="markRented(l)" @verify="toggleVerified(l)" @delete="del(l)"
                      />
                    </li>
                  </ul>
                  <p v-else class="text-sm text-stone-500">No listings.</p>
                </div>
              </div>
            </li>
            <li v-if="!filteredUsers.length" class="p-6 text-center text-sm text-stone-500">No users found.</li>
          </ul>
        </template>

        <!-- ================= Reports ================= -->
        <template v-else>
          <h2 class="hidden text-2xl font-bold lg:block">Reports</h2>
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
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-pencil" :to="`/post?edit=${r.listingId}`">Edit listing</UButton>
                <UButton size="xs" color="success" variant="soft" icon="i-lucide-check" @click="resolveReport(r, 'resolved')">Resolved</UButton>
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="resolveReport(r, 'dismissed')">Dismiss</UButton>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </div>
  </div>
</template>
