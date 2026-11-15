<template>
  <div class="flex min-h-dvh flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
    <AppHeader />
    <DemoBanner />
    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>
    <AppFooter />
    <MobileTabBar />
  </div>
</template>
