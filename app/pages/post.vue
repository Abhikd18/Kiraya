<script setup lang="ts">
import type { City, ElectricityBilling, Furnishing, NewListing, PgDetails, PropertyType, TenantPreference } from '#shared/types/listing'

// /post = new listing, /post?edit=<id> = edit an existing one. Remount when switching between them.
definePageMeta({ key: route => route.fullPath })

const route = useRoute()
const editId = typeof route.query.edit === 'string' ? route.query.edit : ''
const editing = Boolean(editId)

useSeoMeta({ title: editing ? 'Edit your property | Kiraya' : 'Post your property for free | Kiraya' })

const { user, ready, isAdmin, init } = useAuth()
const { create, update, getById, getOwnerPhone, isDemo } = useListings()
const toast = useToast()
const loadingEdit = ref(editing)

onMounted(async () => {
  await init()
  if (!user.value) {
    navigateTo({ path: '/login', query: { next: route.fullPath } })
    return
  }
  if (editing) await loadForEdit()
})

const CITY_CENTERS: Record<City, [number, number]> = {
  'Chandigarh': [30.7333, 76.7794],
  'Mohali': [30.7046, 76.7179],
  'Panchkula': [30.6942, 76.8606],
  'Zirakpur': [30.6425, 76.8173],
  'Kharar': [30.7466, 76.646],
  'New Chandigarh': [30.788, 76.732]
}

const steps = ['Type', 'Location', 'Details', 'Price', 'Photos', 'Contact']
const step = ref(0)
const saving = ref(false)

const form = reactive({
  type: 'flat' as PropertyType,
  postedBy: 'owner' as 'owner' | 'broker',
  title: '',
  description: '',
  city: 'Chandigarh' as City,
  locality: '',
  landmark: '',
  address: '',
  pin: null as { lat: number, lng: number } | null,
  bhk: 2,
  bathrooms: 1,
  areaSqft: null as number | null,
  floor: null as number | null,
  totalFloors: null as number | null,
  furnishing: 'semi-furnished' as Furnishing,
  furnishingItems: [] as string[],
  amenities: [] as string[],
  tenantPreference: ['any'] as TenantPreference[],
  vegOnly: false,
  petsAllowed: false,
  pg: { sharing: 'double', bedsAvailable: 1, food: 'veg', mealsPerDay: 2, gateClosing: '' } as PgDetails,
  houseRules: [] as string[],
  rent: null as number | null,
  deposit: null as number | null,
  maintenance: 0,
  electricity: 'per-unit' as ElectricityBilling,
  negotiable: true,
  availableFrom: new Date().toISOString().slice(0, 10),
  ownerName: '',
  ownerPhone: ''
})

watch(user, (u) => {
  if (editing) return
  if (u && !form.ownerName) form.ownerName = u.name
  if (u?.phone && !form.ownerPhone) form.ownerPhone = u.phone
}, { immediate: true })

// ---- Edit mode: fill the form from the saved listing ----
const existingPhotos = ref<string[]>([])
async function loadForEdit() {
  try {
    const l = await getById(editId, { countView: false })
    if (!l) throw new Error('This listing was not found.')
    if (l.ownerId !== user.value?.id && !isAdmin.value) throw new Error('You can only edit your own listings.')
    Object.assign(form, {
      type: l.type,
      postedBy: l.postedBy,
      title: l.title,
      description: l.description,
      city: l.city,
      locality: l.locality,
      landmark: l.landmark ?? '',
      address: '',
      pin: { lat: l.lat, lng: l.lng },
      bhk: l.bhk,
      bathrooms: l.bathrooms,
      areaSqft: l.areaSqft ?? null,
      floor: l.floor ?? null,
      totalFloors: l.totalFloors ?? null,
      furnishing: l.furnishing,
      furnishingItems: [...l.furnishingItems],
      amenities: [...l.amenities],
      tenantPreference: [...l.tenantPreference],
      vegOnly: l.vegOnly,
      petsAllowed: l.petsAllowed,
      pg: l.pg ? { ...l.pg, gateClosing: l.pg.gateClosing ?? '' } : form.pg,
      houseRules: [...l.houseRules],
      rent: l.rent,
      deposit: l.deposit,
      maintenance: l.maintenance,
      electricity: l.electricity,
      negotiable: l.negotiable,
      availableFrom: l.availableFrom.slice(0, 10),
      ownerName: l.ownerName,
      ownerPhone: (await getOwnerPhone(editId)) ?? ''
    })
    existingPhotos.value = [...l.photos]
  } catch (e) {
    toast.add({ title: 'Can\'t edit this listing', description: (e as Error).message, color: 'error' })
    navigateTo('/dashboard')
  } finally {
    loadingEdit.value = false
  }
}

const isRoomType = computed(() => ['pg', 'room', 'shared-room'].includes(form.type))
const cityItems = CITIES.map(c => ({ label: c, value: c }))
const furnishItems = FURNISHING.map(f => ({ label: f.label, value: f.value }))
const electricityItems = [
  { label: 'Charged per unit', value: 'per-unit' },
  { label: 'Separate meter', value: 'meter' },
  { label: 'Included in rent', value: 'included' }
]
const sharingItems = [
  { label: 'Single', value: 'single' },
  { label: 'Double', value: 'double' },
  { label: 'Triple', value: 'triple' },
  { label: 'Mixed', value: 'mixed' }
]
const foodItems = [
  { label: 'No food', value: 'none' },
  { label: 'Veg', value: 'veg' },
  { label: 'Veg & non-veg', value: 'veg-nonveg' }
]

function toggle<T>(list: T[], value: T) {
  const i = list.indexOf(value)
  if (i >= 0) list.splice(i, 1)
  else list.push(value)
}

function toggleTenant(v: TenantPreference) {
  if (v === 'any') {
    form.tenantPreference = ['any']
    return
  }
  const list = form.tenantPreference.filter(t => t !== 'any')
  toggle(list, v)
  form.tenantPreference = list.length ? list : ['any']
}

// ---- Location search (free OpenStreetMap search) ----
const locating = ref(false)
async function findOnMap() {
  const q = [form.locality, form.landmark, form.city, 'India'].filter(Boolean).join(', ')
  locating.value = true
  try {
    const res = await $fetch<{ lat: string, lon: string }[]>('https://nominatim.openstreetmap.org/search', {
      query: { format: 'json', limit: 1, countrycodes: 'in', q }
    })
    if (res[0]) form.pin = { lat: Number(res[0].lat), lng: Number(res[0].lon) }
    else {
      const [lat, lng] = CITY_CENTERS[form.city]
      form.pin = { lat, lng }
      toast.add({ title: 'Couldn\'t find that exact place', description: 'Tap on the map to put the pin on your building.', color: 'warning' })
    }
  } catch {
    toast.add({ title: 'Map search failed', description: 'Tap on the map to place the pin.', color: 'warning' })
  } finally {
    locating.value = false
  }
}

function useMyLocation() {
  if (!navigator.geolocation) return
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (p) => {
      form.pin = { lat: p.coords.latitude, lng: p.coords.longitude }
      locating.value = false
    },
    () => {
      locating.value = false
      toast.add({ title: 'Location permission denied', color: 'warning' })
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

// ---- Photos ----
const files = ref<File[]>([])
const previews = ref<string[]>([])
const maxPhotos = computed(() => (isDemo ? 4 : 12))

const photoCount = computed(() => existingPhotos.value.length + files.value.length)

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files || []).filter(f => f.type.startsWith('image/'))
  for (const f of picked) {
    if (photoCount.value >= maxPhotos.value) break
    files.value.push(f)
    previews.value.push(URL.createObjectURL(f))
  }
  input.value = ''
}

function removeExisting(i: number) {
  existingPhotos.value.splice(i, 1)
}

function removePhoto(i: number) {
  URL.revokeObjectURL(previews.value[i]!)
  files.value.splice(i, 1)
  previews.value.splice(i, 1)
}

// ---- Validation per step ----
function stepError(s: number): string {
  if (s === 1) {
    if (!form.locality.trim()) return 'Enter the sector or area.'
    if (!form.pin) return 'Put a pin on the map so tenants can find it.'
  }
  if (s === 2) {
    if (form.title.trim().length < 10) return 'Give the listing a title of at least 10 characters.'
  }
  if (s === 3) {
    if (!form.rent || form.rent < 500) return 'Enter the monthly rent.'
    if (form.deposit === null || form.deposit < 0) return 'Enter the security deposit (0 if none).'
  }
  if (s === 5) {
    if (!form.ownerName.trim()) return 'Enter your name.'
    if (!/^[6-9]\d{9}$/.test(form.ownerPhone.replace(/\D/g, '').slice(-10))) return 'Enter a valid 10-digit mobile number.'
  }
  return ''
}

function next() {
  const err = stepError(step.value)
  if (err) {
    toast.add({ title: err, color: 'warning' })
    return
  }
  if (step.value === 1 && !form.title) {
    form.title = `${isRoomType.value ? typeLabel(form.type) : `${form.bhk} BHK ${typeLabel(form.type).toLowerCase()}`} in ${form.locality}`
  }
  step.value = Math.min(step.value + 1, steps.length - 1)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submit() {
  for (let s = 0; s < steps.length; s++) {
    const err = stepError(s)
    if (err) {
      step.value = s
      toast.add({ title: err, color: 'warning' })
      return
    }
  }
  saving.value = true
  try {
    const listing: NewListing = {
      ownerName: form.ownerName.trim(),
      ownerPhone: form.ownerPhone.replace(/\D/g, '').slice(-10),
      postedBy: form.postedBy,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      city: form.city,
      locality: form.locality.trim(),
      landmark: form.landmark.trim() || undefined,
      address: form.address.trim() || undefined,
      lat: form.pin!.lat,
      lng: form.pin!.lng,
      bhk: isRoomType.value ? 1 : form.bhk,
      bathrooms: form.bathrooms,
      areaSqft: form.areaSqft || undefined,
      floor: form.floor ?? undefined,
      totalFloors: form.totalFloors ?? undefined,
      furnishing: form.furnishing,
      furnishingItems: form.furnishingItems,
      amenities: form.amenities,
      tenantPreference: form.tenantPreference,
      vegOnly: form.vegOnly,
      petsAllowed: form.petsAllowed,
      rent: form.rent!,
      deposit: form.deposit ?? 0,
      maintenance: form.maintenance || 0,
      electricity: form.electricity,
      negotiable: form.negotiable,
      availableFrom: form.availableFrom,
      photos: [],
      pg: form.type === 'pg' ? { ...form.pg, gateClosing: form.pg.gateClosing || undefined } : undefined,
      houseRules: form.houseRules
    }
    if (editing) {
      await update(editId, listing, existingPhotos.value, files.value)
      toast.add({ title: 'Changes saved', color: 'success' })
      await navigateTo(`/property/${editId}`)
      return
    }
    const id = await create(listing, files.value)
    toast.add({ title: 'Your property is live!', description: 'It will stay up for 30 days. Renew it from your dashboard.', color: 'success' })
    await navigateTo(`/property/${id}`)
  } catch (e) {
    toast.add({ title: editing ? 'Could not save changes' : 'Could not post property', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <div v-if="!ready || !user || loadingEdit" class="py-20 text-center text-stone-500">
      Loading…
    </div>

    <template v-else>
      <h1 class="text-2xl font-bold sm:text-3xl">{{ editing ? 'Edit your property' : 'Post your property for free' }}</h1>
      <p class="mt-1 text-stone-500">
        {{ editing ? 'Change anything below, then tap "Save changes" on the last step. You can jump between steps at the top.' : 'Takes about 5 minutes. Your listing stays live for 30 days.' }}
      </p>

      <!-- Progress -->
      <ol class="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
        <li v-for="(s, i) in steps" :key="s" class="flex-1">
          <button
            type="button"
            class="w-full min-w-16 rounded-full px-3 py-1.5 text-xs font-medium transition"
            :class="i === step ? 'bg-orange-600 text-white' : i < step ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200' : 'bg-stone-200 text-stone-500 dark:bg-stone-800'"
            :disabled="!editing && i > step"
            @click="step = i"
          >
            {{ i + 1 }}. {{ s }}
          </button>
        </li>
      </ol>

      <div class="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8 dark:border-stone-800 dark:bg-stone-900">
        <!-- Step 1: Type -->
        <div v-if="step === 0" class="space-y-6">
          <div>
            <h2 class="mb-3 font-semibold">What are you renting out?</h2>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                v-for="t in PROPERTY_TYPES"
                :key="t.value"
                type="button"
                class="flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition"
                :class="form.type === t.value ? 'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200' : 'border-stone-200 hover:border-stone-300 dark:border-stone-700'"
                @click="form.type = t.value"
              >
                <UIcon :name="t.icon" class="size-7" />
                {{ t.label }}
              </button>
            </div>
          </div>
          <div>
            <h2 class="mb-3 font-semibold">You are the</h2>
            <div class="flex gap-2">
              <UButton :variant="form.postedBy === 'owner' ? 'solid' : 'outline'" :color="form.postedBy === 'owner' ? 'primary' : 'neutral'" @click="form.postedBy = 'owner'">Owner</UButton>
              <UButton :variant="form.postedBy === 'broker' ? 'solid' : 'outline'" :color="form.postedBy === 'broker' ? 'primary' : 'neutral'" @click="form.postedBy = 'broker'">Broker / agent</UButton>
            </div>
            <p v-if="form.postedBy === 'broker'" class="mt-2 text-sm text-stone-500">Your listing will show a "Broker" label. Mention your fee in the description.</p>
          </div>
        </div>

        <!-- Step 2: Location -->
        <div v-else-if="step === 1" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="City" required>
              <USelect v-model="form.city" :items="cityItems" class="w-full" />
            </UFormField>
            <UFormField label="Sector / area" required>
              <UInput v-model="form.locality" placeholder="e.g. Sector 35, Phase 7, VIP Road" class="w-full" />
            </UFormField>
            <UFormField label="Landmark" hint="Optional">
              <UInput v-model="form.landmark" placeholder="e.g. Near Sector 35 market" class="w-full" />
            </UFormField>
            <UFormField label="House no. / full address" :hint="editing ? 'Kept private. Leave empty to keep the saved one' : 'Kept private'">
              <UInput v-model="form.address" :placeholder="editing ? 'Saved privately, type only to change it' : 'Shared only when you choose'" class="w-full" />
            </UFormField>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton icon="i-lucide-map-pin" color="neutral" variant="outline" :loading="locating" @click="findOnMap">Find on map</UButton>
            <UButton icon="i-lucide-locate-fixed" color="neutral" variant="outline" :loading="locating" @click="useMyLocation">I'm at the property</UButton>
          </div>
          <div class="h-80">
            <ClientOnly>
              <ListingMap v-model="form.pin" pickable :center="CITY_CENTERS[form.city]" :zoom="13" />
            </ClientOnly>
          </div>
          <p class="text-sm text-stone-500">
            {{ form.pin ? 'Pin placed. Drag it to adjust.' : 'Tap on the map to drop a pin on your building.' }}
          </p>
        </div>

        <!-- Step 3: Details -->
        <div v-else-if="step === 2" class="space-y-5">
          <div v-if="!isRoomType" class="grid gap-4 sm:grid-cols-3">
            <UFormField label="Bedrooms (BHK)">
              <UInput v-model.number="form.bhk" type="number" :min="1" :max="10" class="w-full" />
            </UFormField>
            <UFormField label="Bathrooms">
              <UInput v-model.number="form.bathrooms" type="number" :min="1" :max="10" class="w-full" />
            </UFormField>
            <UFormField label="Carpet area (sq ft)" hint="Optional">
              <UInput v-model.number="form.areaSqft" type="number" class="w-full" />
            </UFormField>
            <UFormField label="Floor" hint="0 = ground">
              <UInput v-model.number="form.floor" type="number" :min="0" class="w-full" />
            </UFormField>
            <UFormField label="Total floors">
              <UInput v-model.number="form.totalFloors" type="number" :min="0" class="w-full" />
            </UFormField>
          </div>

          <div v-if="form.type === 'pg'" class="grid gap-4 rounded-xl bg-violet-50 p-4 sm:grid-cols-2 dark:bg-violet-950/30">
            <UFormField label="Sharing">
              <USelect v-model="form.pg.sharing" :items="sharingItems" class="w-full" />
            </UFormField>
            <UFormField label="Beds available">
              <UInput v-model.number="form.pg.bedsAvailable" type="number" :min="1" class="w-full" />
            </UFormField>
            <UFormField label="Food">
              <USelect v-model="form.pg.food" :items="foodItems" class="w-full" />
            </UFormField>
            <UFormField v-if="form.pg.food !== 'none'" label="Meals per day">
              <UInput v-model.number="form.pg.mealsPerDay" type="number" :min="1" :max="4" class="w-full" />
            </UFormField>
            <UFormField label="Gate closing time" hint="Optional">
              <UInput v-model="form.pg.gateClosing" placeholder="e.g. 10:30 pm" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Furnishing">
            <USelect v-model="form.furnishing" :items="furnishItems" class="w-full sm:w-64" />
          </UFormField>

          <div v-if="form.furnishing !== 'unfurnished'">
            <p class="mb-2 text-sm font-medium">What's included</p>
            <div class="flex flex-wrap gap-1.5">
              <UButton
                v-for="item in FURNISHING_ITEMS"
                :key="item"
                size="xs"
                :variant="form.furnishingItems.includes(item) ? 'solid' : 'outline'"
                :color="form.furnishingItems.includes(item) ? 'primary' : 'neutral'"
                @click="toggle(form.furnishingItems, item)"
              >
                {{ item }}
              </UButton>
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm font-medium">Amenities</p>
            <div class="flex flex-wrap gap-1.5">
              <UButton
                v-for="a in AMENITIES"
                :key="a"
                size="xs"
                :variant="form.amenities.includes(a) ? 'solid' : 'outline'"
                :color="form.amenities.includes(a) ? 'primary' : 'neutral'"
                @click="toggle(form.amenities, a)"
              >
                {{ a }}
              </UButton>
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm font-medium">Who can rent?</p>
            <div class="flex flex-wrap gap-1.5">
              <UButton
                v-for="t in TENANT_PREFS"
                :key="t.value"
                size="xs"
                :variant="form.tenantPreference.includes(t.value) ? 'solid' : 'outline'"
                :color="form.tenantPreference.includes(t.value) ? 'primary' : 'neutral'"
                @click="toggleTenant(t.value)"
              >
                {{ t.label }}
              </UButton>
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm font-medium">House rules</p>
            <div class="mb-2 flex flex-wrap gap-1.5">
              <UButton
                v-for="r in HOUSE_RULES"
                :key="r"
                size="xs"
                :variant="form.houseRules.includes(r) ? 'solid' : 'outline'"
                :color="form.houseRules.includes(r) ? 'primary' : 'neutral'"
                @click="toggle(form.houseRules, r)"
              >
                {{ r }}
              </UButton>
            </div>
            <div class="flex flex-wrap gap-4">
              <UCheckbox v-model="form.vegOnly" label="Vegetarian only" />
              <UCheckbox v-model="form.petsAllowed" label="Pets allowed" />
            </div>
          </div>

          <UFormField label="Listing title" required>
            <UInput v-model="form.title" :maxlength="120" placeholder="e.g. Sunny 2BHK near Sector 35 market" class="w-full" />
          </UFormField>
          <UFormField label="Description" hint="What makes it good? Nearby market, transport, rules…">
            <UTextarea v-model="form.description" :rows="5" :maxlength="2000" class="w-full" />
          </UFormField>
        </div>

        <!-- Step 4: Price -->
        <div v-else-if="step === 3" class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Monthly rent (₹)" required>
            <UInput v-model.number="form.rent" type="number" :min="500" placeholder="e.g. 15000" class="w-full" />
          </UFormField>
          <UFormField label="Security deposit (₹)" required>
            <UInput v-model.number="form.deposit" type="number" :min="0" placeholder="e.g. 30000" class="w-full" />
          </UFormField>
          <UFormField label="Maintenance per month (₹)" hint="0 if included">
            <UInput v-model.number="form.maintenance" type="number" :min="0" class="w-full" />
          </UFormField>
          <UFormField label="Electricity">
            <USelect v-model="form.electricity" :items="electricityItems" class="w-full" />
          </UFormField>
          <UFormField label="Available from">
            <UInput v-model="form.availableFrom" type="date" class="w-full" />
          </UFormField>
          <div class="flex items-end pb-2">
            <UCheckbox v-model="form.negotiable" label="Rent is negotiable" />
          </div>
        </div>

        <!-- Step 5: Photos -->
        <div v-else-if="step === 4" class="space-y-4">
          <p class="text-sm text-stone-600 dark:text-stone-400">
            Listings with 4 or more clear photos get many more calls. Add the bedroom, kitchen, bathroom and the outside view.
            <span v-if="isDemo" class="block text-amber-700">Demo mode: up to 4 photos, saved in this browser only.</span>
          </p>
          <label class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center hover:border-orange-400 dark:border-stone-700">
            <UIcon name="i-lucide-image-plus" class="size-10 text-orange-600" />
            <span class="font-medium">Tap to add photos</span>
            <span class="text-xs text-stone-500">{{ photoCount }} / {{ maxPhotos }} added · JPG or PNG</span>
            <input type="file" accept="image/*" multiple class="hidden" @change="onFiles">
          </label>
          <div v-if="photoCount" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <div v-for="(p, i) in existingPhotos" :key="p" class="relative aspect-square overflow-hidden rounded-xl">
              <img :src="p" alt="" class="size-full object-cover">
              <span v-if="i === 0" class="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white">Cover</span>
              <UButton size="xs" color="neutral" icon="i-lucide-x" class="absolute right-1 top-1" aria-label="Remove photo" @click="removeExisting(i)" />
            </div>
            <div v-for="(p, i) in previews" :key="p" class="relative aspect-square overflow-hidden rounded-xl">
              <img :src="p" alt="" class="size-full object-cover">
              <span v-if="i === 0 && !existingPhotos.length" class="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white">Cover</span>
              <span v-else-if="editing" class="absolute left-1 top-1 rounded bg-orange-600 px-1.5 text-[10px] text-white">New</span>
              <UButton size="xs" color="neutral" icon="i-lucide-x" class="absolute right-1 top-1" aria-label="Remove photo" @click="removePhoto(i)" />
            </div>
          </div>
        </div>

        <!-- Step 6: Contact -->
        <div v-else class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Your name" required>
              <UInput v-model="form.ownerName" class="w-full" />
            </UFormField>
            <UFormField label="Mobile number" required hint="Shown only to logged-in users">
              <UInput v-model="form.ownerPhone" type="tel" placeholder="10-digit mobile" :maxlength="13" class="w-full" />
            </UFormField>
          </div>

          <div class="rounded-xl bg-stone-50 p-4 text-sm dark:bg-stone-950">
            <p class="mb-2 font-semibold">Summary</p>
            <p>{{ form.title || 'Untitled' }}</p>
            <p class="text-stone-500">{{ form.locality }}, {{ form.city }} · {{ form.rent ? formatRent(form.rent) + '/month' : 'No rent set' }} · {{ photoCount }} photos</p>
          </div>
          <p class="text-xs text-stone-500">
            By posting you confirm you own this property or are allowed to rent it out, and you agree to the
            <NuxtLink to="/terms" class="underline">terms of use</NuxtLink>.
          </p>
        </div>

        <!-- Navigation -->
        <div class="mt-8 flex justify-between gap-3 border-t border-stone-200 pt-5 dark:border-stone-800">
          <UButton v-if="step > 0" color="neutral" variant="outline" icon="i-lucide-arrow-left" @click="step--">Back</UButton>
          <span v-else />
          <UButton v-if="step < steps.length - 1" trailing-icon="i-lucide-arrow-right" @click="next">Next</UButton>
          <UButton v-else :icon="editing ? 'i-lucide-save' : 'i-lucide-send'" :loading="saving" @click="submit">{{ editing ? 'Save changes' : 'Post property' }}</UButton>
        </div>
      </div>
    </template>
  </div>
</template>
