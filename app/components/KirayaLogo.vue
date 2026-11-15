<script setup lang="ts">
defineProps<{ light?: boolean }>()
</script>

<template>
  <NuxtLink to="/" class="flex items-center gap-2" aria-label="Kiraya home">
    <span class="grid size-9 place-items-center rounded-xl bg-orange-600 text-white shadow-sm">
      <UIcon name="i-lucide-key-round" class="size-5" />
    </span>
    <span class="text-xl font-bold tracking-tight" :class="light ? 'text-white' : 'text-stone-900 dark:text-white'">
      Kiraya
    </span>
  </NuxtLink>
</template>
