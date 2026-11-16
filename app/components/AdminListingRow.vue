<script setup lang="ts">
import type { Listing, ListingStatus } from '#shared/types/listing'

const props = defineProps<{ listing: Listing, owner?: string, busy?: boolean, compact?: boolean }>()
defineEmits<{ publish: [], pause: [], rented: [], verify: [], delete: [], owner: [] }>()

const status = computed<ListingStatus>(() =>
  props.listing.status === 'live' && new Date(props.listing.expiresAt).getTime() < Date.now() ? 'expired' : props.listing.status
)
const statusColor: Record<ListingStatus, 'success' | 'warning' | 'neutral' | 'error' | 'info'> = {
  live: 'success', pending: 'warning', rented: 'info', paused: 'neutral', expired: 'error'
}
const posted = computed(() => new Date(props.listing.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
</script>

<template>
  <div class="flex gap-3" :class="compact ? 'items-center' : 'flex-col sm:flex-row sm:gap-4'">
    <NuxtLink :to="`/property/${listing.id}`" class="shrink-0 overflow-hidden rounded-xl" :class="compact ? 'size-14' : 'h-24 w-full sm:w-36'">
      <PropertyPhoto :src="listing.photos[0]" :type="listing.type" :alt="listing.title" />
    </NuxtLink>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-1.5">
        <UBadge :color="statusColor[status]" variant="soft" size="sm" :label="status" />
        <UBadge v-if="listing.verified" color="success" variant="outline" size="sm" icon="i-lucide-badge-check" label="Verified" />
        <UBadge v-if="listing.postedBy === 'broker'" color="warning" variant="outline" size="sm" label="Broker" />
        <span v-if="!compact" class="text-xs text-stone-500">{{ listing.views }} views · posted {{ posted }}</span>
      </div>
      <NuxtLink :to="`/property/${listing.id}`" class="mt-0.5 block truncate font-semibold hover:text-orange-600">{{ listing.title }}</NuxtLink>
      <p class="truncate text-sm text-stone-500">
        {{ listing.locality }}, {{ listing.city }} · {{ formatRent(listing.rent) }}/mo
        <template v-if="owner">
          ·
          <button type="button" class="underline hover:text-orange-600" @click="$emit('owner')">{{ owner }}</button>
        </template>
      </p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-pencil" :to="`/post?edit=${listing.id}`">Edit</UButton>
        <UButton v-if="status !== 'live'" size="xs" icon="i-lucide-eye" :loading="busy" @click="$emit('publish')">Publish</UButton>
        <UButton v-else size="xs" color="neutral" variant="soft" icon="i-lucide-pause" :loading="busy" @click="$emit('pause')">Pause</UButton>
        <UButton v-if="status === 'live' && !compact" size="xs" color="info" variant="soft" icon="i-lucide-check" @click="$emit('rented')">Mark rented</UButton>
        <UButton size="xs" color="success" variant="soft" :icon="listing.verified ? 'i-lucide-badge-x' : 'i-lucide-badge-check'" @click="$emit('verify')">
          {{ listing.verified ? 'Unverify' : 'Verify' }}
        </UButton>
        <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" :aria-label="`Delete ${listing.title}`" @click="$emit('delete')">
          <span v-if="!compact">Delete</span>
        </UButton>
      </div>
    </div>
  </div>
</template>
