<script setup lang="ts">
defineProps<{ title: string, updated: string }>()
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <h1 class="text-3xl font-bold">{{ title }}</h1>
    <p class="mb-8 text-sm text-stone-500">Last updated {{ updated }}</p>
    <div class="space-y-5 leading-relaxed text-stone-700 dark:text-stone-300 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900 dark:[&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <slot />
    </div>
  </div>
</template>
