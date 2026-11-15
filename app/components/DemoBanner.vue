<script setup lang="ts">
const hasBackend = useHasBackend()
const hidden = ref(false)
</script>

<template>
  <div v-if="!hasBackend && !hidden" class="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs sm:text-sm">
      <p>
        <strong>Demo mode:</strong> sample listings are shown and anything you post is saved only in this browser.
      </p>
      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" aria-label="Hide" @click="hidden = true" />
    </div>
  </div>
</template>
