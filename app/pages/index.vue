<script setup lang="ts">
import type { Listing } from '#shared/types/listing'

useSeoMeta({
  title: 'Kiraya – Broker-free flats, PGs & rooms in Chandigarh, Mohali, Panchkula',
  description: 'Search verified flats, PGs and rooms for rent across Chandigarh Tricity. Owners post properties for free.'
})

const { search, isDemo } = useListings()
const { data: latest, refresh } = await useAsyncData<Listing[]>('home-latest', () => search({ sort: 'newest' }).then(l => l.slice(0, 8)), {
  default: () => []
})
// Demo mode: also show listings posted in this browser (localStorage isn't available on the server)
if (isDemo) onNuxtReady(() => refresh())

const steps = [
  { icon: 'i-lucide-search', title: 'Search by sector', text: 'Filter by budget, BHK, PG or room, and who the owner wants as tenant.' },
  { icon: 'i-lucide-message-circle', title: 'Talk to the owner', text: 'Call or WhatsApp the owner directly. No brokerage on owner listings.' },
  { icon: 'i-lucide-key-round', title: 'Visit and move in', text: 'Every listing expires in 30 days, so what you see is still available.' }
]

const cityCards = [
  { name: 'Chandigarh', note: 'Sectors 1–63, near PU & PGI' },
  { name: 'Mohali', note: 'Phases, IT City, Aerocity' },
  { name: 'Panchkula', note: 'Quiet sectors for families' },
  { name: 'Zirakpur', note: 'Budget flats on VIP Road' },
  { name: 'Kharar', note: 'PGs near Chandigarh University' },
  { name: 'New Chandigarh', note: 'New townships, Mullanpur' }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500">
      <div class="absolute inset-0 opacity-10 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:20px_20px]" />
      <div class="relative mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <p class="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white">
          <UIcon name="i-lucide-map-pin" class="size-4" /> Chandigarh · Mohali · Panchkula · Zirakpur · Kharar
        </p>
        <h1 class="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
          Find your next home in Tricity, without a broker.
        </h1>
        <p class="mt-4 max-w-2xl text-lg text-orange-50">
          Flats, PGs and rooms posted directly by owners. Fresh listings only, every one checked.
        </p>
        <div class="mt-8">
          <SearchBar />
        </div>
        <div class="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          <NuxtLink
            v-for="p in POPULAR_SEARCHES"
            :key="p.label"
            :to="{ path: '/rent', query: p.query }"
            class="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white transition hover:bg-white/25"
          >
            {{ p.label }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Latest listings -->
    <section class="mx-auto max-w-7xl px-4 py-12">
      <div class="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold">Fresh listings</h2>
          <p class="text-stone-500">Posted in the last few days</p>
        </div>
        <UButton to="/rent" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-right">
          See all
        </UButton>
      </div>
      <div v-if="latest.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListingCard v-for="l in latest" :key="l.id" :listing="l" />
      </div>
      <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="aspect-[4/5] animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
      </div>
    </section>

    <!-- Cities -->
    <section class="mx-auto max-w-7xl px-4 pb-12">
      <h2 class="mb-6 text-2xl font-bold">Browse by city</h2>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <NuxtLink
          v-for="c in cityCards"
          :key="c.name"
          :to="{ path: '/rent', query: { city: c.name } }"
          class="rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
        >
          <UIcon name="i-lucide-building" class="mb-2 size-6 text-orange-600" />
          <p class="font-semibold">{{ c.name }}</p>
          <p class="text-xs text-stone-500">{{ c.note }}</p>
        </NuxtLink>
      </div>
    </section>

    <!-- How it works -->
    <section class="bg-white py-12 dark:bg-stone-900">
      <div class="mx-auto max-w-7xl px-4">
        <h2 class="mb-8 text-center text-2xl font-bold">How Kiraya works</h2>
        <div class="grid gap-6 md:grid-cols-3">
          <div v-for="(s, i) in steps" :key="s.title" class="rounded-2xl bg-stone-50 p-6 dark:bg-stone-950">
            <div class="mb-4 flex items-center gap-3">
              <span class="grid size-10 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                <UIcon :name="s.icon" class="size-5" />
              </span>
              <span class="text-sm font-semibold text-stone-400">Step {{ i + 1 }}</span>
            </div>
            <h3 class="mb-1 font-semibold">{{ s.title }}</h3>
            <p class="text-sm text-stone-500">{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Owner CTA -->
    <section class="mx-auto max-w-7xl px-4 py-12">
      <div class="flex flex-col items-start justify-between gap-6 rounded-3xl bg-stone-900 p-8 text-white md:flex-row md:items-center md:p-12">
        <div>
          <h2 class="text-2xl font-bold sm:text-3xl">Have a flat, PG or room to rent?</h2>
          <p class="mt-2 max-w-xl text-stone-300">
            Post it free in 5 minutes. Your phone number stays hidden from people who aren't logged in.
          </p>
        </div>
        <UButton to="/post" size="xl" icon="i-lucide-plus">
          Post property free
        </UButton>
      </div>
    </section>
  </div>
</template>
