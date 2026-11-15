<script setup lang="ts">
import type { City, Furnishing, Listing, ListingFilters, PropertyType, TenantPreference } from '#shared/types/listing'

const route = useRoute()
const router = useRouter()
const { search, isDemo } = useListings()

const num = (v: unknown) => (v ? Number(v) || null : null)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

const filters = reactive<ListingFilters>({
  q: str(route.query.q),
  city: str(route.query.city) as City | '',
  type: str(route.query.type) as PropertyType | '',
  bhk: num(route.query.bhk),
  minRent: num(route.query.min),
  maxRent: num(route.query.max),
  furnishing: str(route.query.furnishing) as Furnishing | '',
  tenant: str(route.query.tenant) as TenantPreference | '',
  ownerOnly: route.query.owner === '1',
  verifiedOnly: route.query.verified === '1',
  sort: (str(route.query.sort) || 'newest') as ListingFilters['sort']
})

const view = ref<'list' | 'map'>('list')
const showFilters = ref(false)

const { data: results, status, refresh } = await useAsyncData<Listing[]>(
  'rent-search',
  () => search({ ...filters }),
  { default: () => [] }
)
// Demo mode: listings posted in this browser live in localStorage, which the server can't read.
// onNuxtReady runs after hydration (a refresh during hydration is ignored).
if (isDemo) onNuxtReady(() => refresh())

// Keep the URL in sync so searches can be shared and bookmarked
let timer: ReturnType<typeof setTimeout> | undefined
watch(filters, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    const query: Record<string, string> = {}
    if (filters.q) query.q = filters.q
    if (filters.city) query.city = filters.city
    if (filters.type) query.type = filters.type
    if (filters.bhk) query.bhk = String(filters.bhk)
    if (filters.minRent) query.min = String(filters.minRent)
    if (filters.maxRent) query.max = String(filters.maxRent)
    if (filters.furnishing) query.furnishing = filters.furnishing
    if (filters.tenant) query.tenant = filters.tenant
    if (filters.ownerOnly) query.owner = '1'
    if (filters.verifiedOnly) query.verified = '1'
    if (filters.sort && filters.sort !== 'newest') query.sort = filters.sort
    router.replace({ query })
    refresh()
  }, 300)
}, { deep: true })

function reset() {
  Object.assign(filters, { q: '', city: '', type: '', bhk: null, minRent: null, maxRent: null, furnishing: '', tenant: '', ownerOnly: false, verifiedOnly: false, sort: 'newest' })
}

const heading = computed(() => {
  const what = filters.type ? typeLabel(filters.type as PropertyType) + 's' : 'Flats, PGs & rooms'
  const where = filters.city || 'Chandigarh Tricity'
  return `${what} for rent in ${where}`
})

useSeoMeta({
  title: () => `${heading.value} | Kiraya`,
  description: () => `Broker-free ${heading.value.toLowerCase()}. Verified owners, fresh listings, no spam.`
})

const sortItems = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Rent: low to high', value: 'price-asc' },
  { label: 'Rent: high to low', value: 'price-desc' }
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ heading }}</h1>
        <p class="text-sm text-stone-500">
          {{ status === 'pending' ? 'Searching…' : `${results.length} ${results.length === 1 ? 'home' : 'homes'} found` }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton class="lg:hidden" color="neutral" variant="outline" icon="i-lucide-sliders-horizontal" @click="showFilters = !showFilters">
          Filters
        </UButton>
        <USelect v-model="filters.sort" :items="sortItems" class="w-44" />
        <div class="flex rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
          <UButton size="sm" :variant="view === 'list' ? 'solid' : 'ghost'" :color="view === 'list' ? 'primary' : 'neutral'" icon="i-lucide-layout-grid" aria-label="List view" @click="view = 'list'" />
          <UButton size="sm" :variant="view === 'map' ? 'solid' : 'ghost'" :color="view === 'map' ? 'primary' : 'neutral'" icon="i-lucide-map" aria-label="Map view" @click="view = 'map'" />
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
      <!-- Filters -->
      <aside :class="showFilters ? 'block' : 'hidden lg:block'">
        <FilterPanel :filters="filters" @reset="reset" />
      </aside>

      <!-- Results -->
      <section>
        <div v-if="view === 'map'" class="h-[70vh] min-h-[420px]">
          <ClientOnly>
            <ListingMap :listings="results" />
          </ClientOnly>
        </div>

        <template v-else>
          <div v-if="status === 'pending' && !results.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <div v-for="i in 6" :key="i" class="aspect-[4/5] animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
          </div>
          <div v-else-if="results.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <ListingCard v-for="l in results" :key="l.id" :listing="l" />
          </div>
          <div v-else class="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <UIcon name="i-lucide-search-x" class="mx-auto mb-3 size-10 text-stone-400" />
            <p class="font-semibold">No homes match these filters yet</p>
            <p class="mb-4 text-sm text-stone-500">Try a bigger budget, another sector, or clear the filters.</p>
            <UButton color="neutral" variant="outline" @click="reset">Clear filters</UButton>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
