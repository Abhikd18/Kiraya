<script setup lang="ts">
const year = new Date().getFullYear()
const cities = ['Chandigarh', 'Mohali', 'Panchkula', 'Zirakpur', 'Kharar']
</script>

<template>
  <footer class="mb-16 border-t border-stone-200 bg-white md:mb-0 dark:border-stone-800 dark:bg-stone-900">
    <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
      <div class="space-y-3">
        <KirayaLogo />
        <p class="text-sm text-stone-500">
          Broker-free flats, PGs and rooms in Chandigarh Tricity. Owners list for free.
        </p>
      </div>
      <div>
        <h3 class="mb-3 text-sm font-semibold">Rent in</h3>
        <ul class="space-y-2 text-sm text-stone-500">
          <li v-for="c in cities" :key="c">
            <NuxtLink :to="{ path: '/rent', query: { city: c } }" class="hover:text-orange-600">Flats & PGs in {{ c }}</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <h3 class="mb-3 text-sm font-semibold">For owners</h3>
        <ul class="space-y-2 text-sm text-stone-500">
          <li><NuxtLink to="/post" class="hover:text-orange-600">Post your property free</NuxtLink></li>
          <li><NuxtLink to="/dashboard" class="hover:text-orange-600">Manage listings</NuxtLink></li>
        </ul>
      </div>
      <div>
        <h3 class="mb-3 text-sm font-semibold">Kiraya</h3>
        <ul class="space-y-2 text-sm text-stone-500">
          <li><NuxtLink to="/terms" class="hover:text-orange-600">Terms of use</NuxtLink></li>
          <li><NuxtLink to="/privacy" class="hover:text-orange-600">Privacy policy</NuxtLink></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-stone-200 py-4 text-center text-xs text-stone-400 dark:border-stone-800">
      © {{ year }} Kiraya · Never pay token money before seeing the property.
    </div>
  </footer>
</template>
