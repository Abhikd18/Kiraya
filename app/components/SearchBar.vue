<script setup lang="ts">
const props = defineProps<{ initialQ?: string, initialCity?: string, initialType?: string }>()

const q = ref(props.initialQ ?? '')
const city = ref(props.initialCity ?? '')
const type = ref(props.initialType ?? '')

const cityItems = [{ label: 'All Tricity', value: 'all' }, ...CITIES.map(c => ({ label: c, value: c }))]
const typeItems = [{ label: 'Any type', value: 'all' }, ...PROPERTY_TYPES.map(t => ({ label: t.label, value: t.value }))]

const cityModel = computed({
  get: () => city.value || 'all',
  set: (v: string) => { city.value = v === 'all' ? '' : v }
})
const typeModel = computed({
  get: () => type.value || 'all',
  set: (v: string) => { type.value = v === 'all' ? '' : v }
})

function submit() {
  const query: Record<string, string> = {}
  if (q.value.trim()) query.q = q.value.trim()
  if (city.value) query.city = city.value
  if (type.value) query.type = type.value
  navigateTo({ path: '/rent', query })
}
</script>

<template>
  <form class="grid gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-stone-200 sm:grid-cols-[1fr_160px_170px_auto] dark:bg-stone-900 dark:ring-stone-800" @submit.prevent="submit">
    <UInput
      v-model="q"
      icon="i-lucide-search"
      size="xl"
      variant="none"
      placeholder="Sector, area, college or landmark…"
      class="w-full"
    />
    <USelect v-model="cityModel" :items="cityItems" size="xl" variant="soft" class="w-full" />
    <USelect v-model="typeModel" :items="typeItems" size="xl" variant="soft" class="w-full" />
    <UButton type="submit" size="xl" icon="i-lucide-search" class="justify-center">
      Search
    </UButton>
  </form>
</template>
