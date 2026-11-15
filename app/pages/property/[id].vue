<script setup lang="ts">
import type { Listing } from '#shared/types/listing'

const route = useRoute()
const id = String(route.params.id)
const { getById, getOwnerPhone, toggleSave, savedIds, report, isDemo } = useListings()
const { user } = useAuth()
const toast = useToast()

const { data: listing, status, refresh } = await useAsyncData<Listing | null>(`listing-${id}`, () => getById(id), {
  default: () => null
})
// Demo mode: a listing posted in this browser is only in localStorage, so look again on the client
if (isDemo) {
  onNuxtReady(() => {
    if (!listing.value) refresh()
  })
}

const photo = ref(0)
const phone = ref<string | null>(null)
const phoneLoading = ref(false)
const reportOpen = ref(false)
const reportReason = ref('')
const reportReasons = ['Already rented', 'Fake or wrong photos', 'Broker posing as owner', 'Wrong price or location', 'Asked for money before visit']

const saved = computed(() => savedIds.value.includes(id))

useSeoMeta({
  title: () => listing.value ? `${listingHeadline(listing.value)} for rent in ${listing.value.locality}, ${listing.value.city} – ${formatRent(listing.value.rent)} | Kiraya` : 'Property | Kiraya',
  description: () => listing.value?.description.slice(0, 155) || 'Property for rent on Kiraya',
  ogImage: () => listing.value?.photos[0]?.startsWith('http') ? listing.value.photos[0] : undefined
})

const facts = computed(() => {
  const l = listing.value
  if (!l) return []
  const out: { icon: string, label: string, value: string }[] = [
    { icon: 'i-lucide-home', label: 'Type', value: typeLabel(l.type) },
    { icon: 'i-lucide-sofa', label: 'Furnishing', value: furnishingLabel(l.furnishing) },
    { icon: 'i-lucide-calendar', label: 'Available from', value: new Date(l.availableFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { icon: 'i-lucide-users', label: 'Preferred tenants', value: l.tenantPreference.map(tenantLabel).join(', ') }
  ]
  if (l.type !== 'pg' && l.type !== 'room' && l.type !== 'shared-room') out.splice(1, 0, { icon: 'i-lucide-bed', label: 'Bedrooms', value: `${l.bhk} BHK` })
  out.push({ icon: 'i-lucide-bath', label: 'Bathrooms', value: String(l.bathrooms) })
  if (l.areaSqft) out.push({ icon: 'i-lucide-ruler', label: 'Carpet area', value: `${l.areaSqft} sq ft` })
  if (l.floor !== undefined && l.floor !== null) out.push({ icon: 'i-lucide-building', label: 'Floor', value: `${l.floor === 0 ? 'Ground' : l.floor}${l.totalFloors ? ` of ${l.totalFloors}` : ''}` })
  out.push({ icon: 'i-lucide-zap', label: 'Electricity', value: { 'included': 'Included in rent', 'per-unit': 'Charged per unit', 'meter': 'Separate meter' }[l.electricity] })
  return out
})

async function showPhone() {
  if (!user.value) {
    await navigateTo({ path: '/login', query: { next: route.fullPath } })
    return
  }
  phoneLoading.value = true
  try {
    phone.value = await getOwnerPhone(id)
    if (!phone.value) toast.add({ title: 'Phone number not available', color: 'warning' })
  } catch (e) {
    toast.add({ title: 'Could not load phone number', description: (e as Error).message, color: 'error' })
  } finally {
    phoneLoading.value = false
  }
}

const whatsappLink = computed(() => {
  if (!phone.value || !listing.value) return ''
  const digits = phone.value.replace(/\D/g, '')
  const intl = digits.length === 10 ? '91' + digits : digits
  const msg = `Hi, I saw your property "${listing.value.title}" on Kiraya. Is it still available?`
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`
})

async function submitReport() {
  if (!reportReason.value) return
  try {
    await report(id, reportReason.value)
    toast.add({ title: 'Thanks for reporting', description: 'We will check this listing.', color: 'success' })
    reportOpen.value = false
    reportReason.value = ''
  } catch (e) {
    toast.add({ title: 'Could not send report', description: (e as Error).message, color: 'error' })
  }
}

async function share() {
  const url = window.location.href
  if (navigator.share) {
    await navigator.share({ title: listing.value?.title, url }).catch(() => {})
  } else {
    await navigator.clipboard.writeText(url)
    toast.add({ title: 'Link copied', color: 'success' })
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6">
    <UButton to="/rent" color="neutral" variant="link" icon="i-lucide-arrow-left" class="mb-3 px-0">
      Back to search
    </UButton>

    <div v-if="status === 'pending' && !listing" class="space-y-4">
      <div class="aspect-[16/9] animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
      <div class="h-8 w-1/2 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
    </div>

    <div v-else-if="!listing" class="rounded-2xl border border-dashed border-stone-300 p-12 text-center">
      <UIcon name="i-lucide-house-plus" class="mx-auto mb-3 size-10 text-stone-400" />
      <p class="text-lg font-semibold">This property isn't available any more</p>
      <p class="mb-4 text-stone-500">It may have been rented out or removed by the owner.</p>
      <UButton to="/rent">Find similar homes</UButton>
    </div>

    <div v-else class="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div class="space-y-6">
        <!-- Gallery -->
        <div>
          <div class="aspect-[16/10] overflow-hidden rounded-2xl bg-stone-100">
            <PropertyPhoto :src="listing.photos[photo]" :type="listing.type" :alt="listing.title" />
          </div>
          <div v-if="listing.photos.length > 1" class="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            <button
              v-for="(p, i) in listing.photos"
              :key="i"
              type="button"
              class="h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2"
              :class="i === photo ? 'ring-orange-500' : 'ring-transparent'"
              @click="photo = i"
            >
              <img :src="p" :alt="`Photo ${i + 1}`" class="size-full object-cover">
            </button>
          </div>
        </div>

        <!-- Title -->
        <div>
          <div class="mb-2 flex flex-wrap gap-2">
            <UBadge v-if="listing.verified" color="success" icon="i-lucide-badge-check" label="Verified owner" />
            <UBadge :color="listing.postedBy === 'broker' ? 'warning' : 'neutral'" variant="soft" :label="listing.postedBy === 'broker' ? 'Posted by broker' : 'Posted by owner · No brokerage'" />
            <UBadge color="neutral" variant="outline" :label="`Posted ${timeAgo(listing.createdAt).toLowerCase()}`" />
          </div>
          <h1 class="text-2xl font-bold sm:text-3xl">{{ listing.title }}</h1>
          <p class="mt-1 flex items-center gap-1 text-stone-500">
            <UIcon name="i-lucide-map-pin" class="size-4" />
            {{ listing.locality }}, {{ listing.city }}<template v-if="listing.landmark"> · {{ listing.landmark }}</template>
          </p>
        </div>

        <!-- Key facts -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div v-for="f in facts" :key="f.label" class="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
            <p class="flex items-center gap-1.5 text-xs text-stone-500">
              <UIcon :name="f.icon" class="size-4" /> {{ f.label }}
            </p>
            <p class="mt-1 text-sm font-semibold">{{ f.value }}</p>
          </div>
        </div>

        <!-- PG details -->
        <div v-if="listing.pg" class="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/40">
          <h2 class="mb-3 font-semibold">PG details</h2>
          <ul class="grid gap-2 text-sm sm:grid-cols-2">
            <li><strong>Sharing:</strong> {{ listing.pg.sharing }}</li>
            <li><strong>Beds available:</strong> {{ listing.pg.bedsAvailable }}</li>
            <li><strong>Food:</strong> {{ listing.pg.food === 'none' ? 'Not included' : `${listing.pg.food === 'veg' ? 'Veg' : 'Veg & non-veg'}, ${listing.pg.mealsPerDay} meals/day` }}</li>
            <li v-if="listing.pg.gateClosing"><strong>Gate closes:</strong> {{ listing.pg.gateClosing }}</li>
          </ul>
        </div>

        <!-- Description -->
        <div v-if="listing.description">
          <h2 class="mb-2 text-lg font-semibold">About this property</h2>
          <p class="whitespace-pre-line text-stone-700 dark:text-stone-300">{{ listing.description }}</p>
        </div>

        <!-- Amenities -->
        <div v-if="listing.amenities.length || listing.furnishingItems.length" class="grid gap-6 sm:grid-cols-2">
          <div v-if="listing.amenities.length">
            <h2 class="mb-2 text-lg font-semibold">Amenities</h2>
            <ul class="space-y-1.5 text-sm">
              <li v-for="a in listing.amenities" :key="a" class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="size-4 text-emerald-600" /> {{ a }}
              </li>
            </ul>
          </div>
          <div v-if="listing.furnishingItems.length">
            <h2 class="mb-2 text-lg font-semibold">What's included</h2>
            <ul class="space-y-1.5 text-sm">
              <li v-for="a in listing.furnishingItems" :key="a" class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="size-4 text-emerald-600" /> {{ a }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Rules -->
        <div v-if="listing.houseRules.length || listing.vegOnly || listing.petsAllowed">
          <h2 class="mb-2 text-lg font-semibold">House rules</h2>
          <div class="flex flex-wrap gap-2">
            <UBadge v-if="listing.vegOnly" color="success" variant="soft" label="Vegetarian only" />
            <UBadge v-if="listing.petsAllowed" color="info" variant="soft" label="Pets allowed" />
            <UBadge v-for="r in listing.houseRules" :key="r" color="neutral" variant="soft" :label="r" />
          </div>
        </div>

        <!-- Map -->
        <div>
          <h2 class="mb-2 text-lg font-semibold">Location</h2>
          <div class="h-72">
            <ClientOnly>
              <ListingMap :listings="[listing]" :zoom="15" />
            </ClientOnly>
          </div>
          <p class="mt-2 text-xs text-stone-500">Exact house number is shared by the owner when you call.</p>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <p class="text-3xl font-extrabold">{{ formatRent(listing.rent) }}<span class="text-base font-normal text-stone-500">/month</span></p>
          <dl class="mt-3 space-y-1.5 text-sm">
            <div class="flex justify-between"><dt class="text-stone-500">Security deposit</dt><dd class="font-medium">{{ formatRent(listing.deposit) }}</dd></div>
            <div class="flex justify-between"><dt class="text-stone-500">Maintenance</dt><dd class="font-medium">{{ listing.maintenance ? formatRent(listing.maintenance) + '/mo' : 'Included' }}</dd></div>
            <div class="flex justify-between"><dt class="text-stone-500">Rent negotiable</dt><dd class="font-medium">{{ listing.negotiable ? 'Yes' : 'No' }}</dd></div>
          </dl>

          <div class="mt-5 border-t border-stone-200 pt-4 dark:border-stone-800">
            <p class="text-sm text-stone-500">{{ listing.postedBy === 'broker' ? 'Broker' : 'Owner' }}</p>
            <p class="font-semibold">{{ listing.ownerName }}</p>
          </div>

          <div class="mt-4 space-y-2">
            <template v-if="phone">
              <UButton :to="`tel:${phone}`" block size="lg" icon="i-lucide-phone">Call {{ phone }}</UButton>
              <UButton :to="whatsappLink" target="_blank" block size="lg" color="success" variant="soft" icon="i-lucide-message-circle">WhatsApp owner</UButton>
            </template>
            <UButton v-else block size="lg" icon="i-lucide-phone" :loading="phoneLoading" @click="showPhone">
              {{ user ? 'Show phone number' : 'Log in to contact owner' }}
            </UButton>
            <div class="grid grid-cols-2 gap-2">
              <UButton block color="neutral" variant="outline" :icon="'i-lucide-heart'" @click="toggleSave(listing.id)">
                {{ saved ? 'Saved' : 'Save' }}
              </UButton>
              <UButton block color="neutral" variant="outline" icon="i-lucide-share-2" @click="share">Share</UButton>
            </div>
          </div>
        </div>

        <div class="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p class="flex items-center gap-2 font-semibold"><UIcon name="i-lucide-shield-alert" class="size-4" /> Stay safe</p>
          <p class="mt-1">Never pay token money or deposit before you visit the property and meet the owner.</p>
        </div>

        <div class="text-center">
          <UButton color="neutral" variant="link" size="sm" icon="i-lucide-flag" @click="reportOpen = !reportOpen">
            Report this listing
          </UButton>
          <div v-if="reportOpen" class="mt-2 space-y-2 rounded-xl border border-stone-200 bg-white p-3 text-left dark:border-stone-800 dark:bg-stone-900">
            <p class="text-sm font-medium">What's wrong?</p>
            <div class="flex flex-wrap gap-1.5">
              <UButton
                v-for="r in reportReasons"
                :key="r"
                size="xs"
                :variant="reportReason === r ? 'solid' : 'outline'"
                :color="reportReason === r ? 'error' : 'neutral'"
                @click="reportReason = r"
              >
                {{ r }}
              </UButton>
            </div>
            <UButton size="sm" color="error" block :disabled="!reportReason" @click="submitReport">Send report</UButton>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
