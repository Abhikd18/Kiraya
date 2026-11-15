<script setup lang="ts">
import type { Listing } from '#shared/types/listing'

useSeoMeta({ title: 'Saved homes | Kiraya' })

const { savedListings, savedIds } = useListings()
const items = ref<Listing[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    items.value = await savedListings()
  } finally {
    loading.value = false
  }
}

onMounted(load)
// Remove a card as soon as it's un-saved
watch(savedIds, ids => {
  items.value = items.value.filter(l => ids.includes(l.id))
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <h1 class="mb-1 text-2xl font-bold">Saved homes</h1>
    <p class="mb-6 text-stone-500">Your shortlist, saved on this device.</p>

    <div v-if="loading" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="aspect-[4/5] animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
    </div>
    <div v-else-if="items.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <ListingCard v-for="l in items" :key="l.id" :listing="l" />
    </div>
    <div v-else class="rounded-2xl border border-dashed border-stone-300 p-12 text-center dark:border-stone-700">
      <UIcon name="i-lucide-heart" class="mx-auto mb-3 size-10 text-stone-400" />
      <p class="font-semibold">Nothing saved yet</p>
      <p class="mb-4 text-sm text-stone-500">Tap the heart on any home to add it to your shortlist.</p>
      <UButton to="/rent">Start searching</UButton>
    </div>
  </div>
</template>
