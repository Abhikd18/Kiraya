<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
</script>

<template>
  <UApp>
    <div class="grid min-h-dvh place-items-center bg-stone-50 px-4 text-center dark:bg-stone-950">
      <div>
        <span class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-orange-600 text-white">
          <UIcon name="i-lucide-key-round" class="size-7" />
        </span>
        <h1 class="text-3xl font-bold">{{ notFound ? 'Page not found' : 'Something went wrong' }}</h1>
        <p class="mt-2 text-stone-500">{{ notFound ? 'This page may have moved or the listing was removed.' : error.message }}</p>
        <UButton class="mt-6" size="lg" @click="clearError({ redirect: '/' })">Go to home</UButton>
      </div>
    </div>
  </UApp>
</template>
