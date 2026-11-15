<script setup lang="ts">
import type { Listing } from '#shared/types/listing'

const props = defineProps<{ listing: Listing, compact?: boolean }>()
const { savedIds, toggleSave } = useListings()
const saved = computed(() => savedIds.value.includes(props.listing.id))
</script>

<template>
  <article class="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
    <NuxtLink :to="`/property/${listing.id}`" class="block">
      <div class="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <PropertyPhoto :src="listing.photos[0]" :type="listing.type" :alt="listing.title" />
        <div class="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <UBadge v-if="listing.verified" color="success" variant="solid" icon="i-lucide-badge-check" label="Verified" />
          <UBadge v-if="listing.postedBy === 'broker'" color="neutral" variant="solid" label="Broker" />
          <UBadge v-else color="neutral" variant="soft" label="Owner" />
        </div>
        <span v-if="listing.photos.length > 1" class="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
          {{ listing.photos.length }} photos
        </span>
      </div>
    </NuxtLink>
    <div class="space-y-2 p-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="text-lg font-bold">
            {{ formatRent(listing.rent) }}<span class="text-sm font-normal text-stone-500">/month</span>
          </p>
          <p class="text-sm font-medium text-stone-700 dark:text-stone-300">
            {{ listingHeadline(listing) }}
          </p>
        </div>
        <UButton
          :icon="saved ? 'i-lucide-heart' : 'i-lucide-heart'"
          :color="saved ? 'error' : 'neutral'"
          :variant="saved ? 'soft' : 'ghost'"
          :aria-label="saved ? 'Remove from saved' : 'Save'"
          @click="toggleSave(listing.id)"
        />
      </div>
      <NuxtLink :to="`/property/${listing.id}`" class="line-clamp-1 text-sm text-stone-600 hover:text-orange-600 dark:text-stone-400">
        {{ listing.title }}
      </NuxtLink>
      <p class="flex items-center gap-1 text-sm text-stone-500">
        <UIcon name="i-lucide-map-pin" class="size-4 shrink-0" />
        <span class="line-clamp-1">{{ listing.locality }}, {{ listing.city }}</span>
      </p>
      <div v-if="!compact" class="flex flex-wrap gap-1.5 pt-1 text-xs text-stone-600 dark:text-stone-400">
        <span class="rounded-md bg-stone-100 px-2 py-1 dark:bg-stone-800">{{ furnishingLabel(listing.furnishing) }}</span>
        <span class="rounded-md bg-stone-100 px-2 py-1 dark:bg-stone-800">{{ tenantLabel(listing.tenantPreference[0] || 'any') }}</span>
        <span class="rounded-md bg-stone-100 px-2 py-1 dark:bg-stone-800">{{ timeAgo(listing.createdAt) }}</span>
      </div>
    </div>
  </article>
</template>
