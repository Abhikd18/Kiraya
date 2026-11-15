<script setup lang="ts">
import type { PropertyType } from '#shared/types/listing'

const props = defineProps<{ src?: string, type: PropertyType, alt?: string }>()
const failed = ref(false)

const icon = computed(() => PROPERTY_TYPES.find(p => p.value === props.type)?.icon ?? 'i-lucide-house')
const gradient = computed(() => ({
  'flat': 'from-orange-100 to-amber-200',
  'independent-floor': 'from-sky-100 to-cyan-200',
  'house': 'from-emerald-100 to-lime-200',
  'pg': 'from-violet-100 to-fuchsia-200',
  'room': 'from-rose-100 to-orange-200',
  'shared-room': 'from-teal-100 to-sky-200'
}[props.type]))
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="alt || 'Property photo'"
    loading="lazy"
    class="size-full object-cover"
    @error="failed = true"
  >
  <div v-else class="grid size-full place-items-center bg-gradient-to-br" :class="gradient">
    <div class="flex flex-col items-center gap-1 text-stone-600/70">
      <UIcon :name="icon" class="size-10" />
      <span class="text-xs font-medium">No photo yet</span>
    </div>
  </div>
</template>
