<script setup lang="ts">
import type { ListingFilters } from '#shared/types/listing'

const props = defineProps<{ filters: ListingFilters }>()
defineEmits<{ reset: [] }>()

const ALL = 'all'
const cityItems = [{ label: 'All Tricity', value: ALL }, ...CITIES.map(c => ({ label: c, value: c }))]
const typeItems = [{ label: 'Any type', value: ALL }, ...PROPERTY_TYPES.map(t => ({ label: t.label, value: t.value }))]
const furnishItems = [{ label: 'Any', value: ALL }, ...FURNISHING]
const tenantItems = [{ label: 'Anyone', value: ALL }, ...TENANT_PREFS.filter(t => t.value !== 'any')]
const bhkOptions = [1, 2, 3, 4]

// USelect can't hold an empty value, so "all" stands for "no filter"
function selectModel(key: 'city' | 'type' | 'furnishing' | 'tenant') {
  return computed({
    get: () => (props.filters[key] as string) || ALL,
    set: (v: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (props.filters as any)[key] = v === ALL ? '' : v
    }
  })
}
const city = selectModel('city')
const type = selectModel('type')
const furnishing = selectModel('furnishing')
const tenant = selectModel('tenant')

const budgets = [
  { label: 'Under ₹8k', min: null, max: 8000 },
  { label: '₹8k–15k', min: 8000, max: 15000 },
  { label: '₹15k–25k', min: 15000, max: 25000 },
  { label: '₹25k+', min: 25000, max: null }
]
// UInput's model can't be null, so map null <-> undefined (an empty box clears the filter)
const minRent = computed({
  get: () => props.filters.minRent ?? undefined,
  set: (v: number | string | undefined) => { props.filters.minRent = Number(v) || null }
})
const maxRent = computed({
  get: () => props.filters.maxRent ?? undefined,
  set: (v: number | string | undefined) => { props.filters.maxRent = Number(v) || null }
})

function pickBudget(b: { min: number | null, max: number | null }) {
  const f = props.filters
  const same = f.minRent === b.min && f.maxRent === b.max
  f.minRent = same ? null : b.min
  f.maxRent = same ? null : b.max
}
</script>

<template>
  <div class="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 lg:sticky lg:top-20">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold">Filters</h2>
      <UButton size="xs" color="neutral" variant="link" @click="$emit('reset')">Reset</UButton>
    </div>

    <UFormField label="Search">
      <UInput v-model="filters.q" icon="i-lucide-search" placeholder="Sector 22, PU, IT City…" class="w-full" />
    </UFormField>

    <UFormField label="City">
      <USelect v-model="city" :items="cityItems" class="w-full" />
    </UFormField>

    <UFormField label="Property type">
      <USelect v-model="type" :items="typeItems" class="w-full" />
    </UFormField>

    <UFormField label="Budget (per month)">
      <div class="mb-2 flex flex-wrap gap-1.5">
        <UButton
          v-for="b in budgets"
          :key="b.label"
          size="xs"
          :variant="filters.minRent === b.min && filters.maxRent === b.max ? 'solid' : 'outline'"
          :color="filters.minRent === b.min && filters.maxRent === b.max ? 'primary' : 'neutral'"
          @click="pickBudget(b)"
        >
          {{ b.label }}
        </UButton>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <UInput v-model.number="minRent" type="number" placeholder="Min ₹" />
        <UInput v-model.number="maxRent" type="number" placeholder="Max ₹" />
      </div>
    </UFormField>

    <UFormField label="BHK">
      <div class="flex gap-1.5">
        <UButton
          v-for="b in bhkOptions"
          :key="b"
          size="sm"
          :variant="filters.bhk === b ? 'solid' : 'outline'"
          :color="filters.bhk === b ? 'primary' : 'neutral'"
          @click="filters.bhk = filters.bhk === b ? null : b"
        >
          {{ b === 4 ? '4+' : b }}
        </UButton>
      </div>
    </UFormField>

    <UFormField label="Furnishing">
      <USelect v-model="furnishing" :items="furnishItems" class="w-full" />
    </UFormField>

    <UFormField label="I am">
      <USelect v-model="tenant" :items="tenantItems" class="w-full" />
    </UFormField>

    <div class="space-y-2">
      <UCheckbox v-model="filters.ownerOnly" label="Owners only (no brokers)" />
      <UCheckbox v-model="filters.verifiedOnly" label="Verified listings only" />
    </div>
  </div>
</template>
