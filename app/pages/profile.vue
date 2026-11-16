<script setup lang="ts">
import type { UserRole } from '~/composables/useAuth'

useSeoMeta({ title: 'My profile | Kiraya', robots: 'noindex' })

const { user, ready, isAdmin, init, updateProfile, signOut } = useAuth()
const toast = useToast()

const form = reactive({ name: '', phone: '', role: '' as UserRole | '', city: '' })
const saving = ref(false)

function fill() {
  if (!user.value) return
  form.name = user.value.name || ''
  form.phone = user.value.phone || ''
  form.role = user.value.role || ''
  form.city = user.value.city || ''
}

onMounted(async () => {
  await init()
  if (!user.value) {
    navigateTo({ path: '/login', query: { next: '/profile' } })
    return
  }
  fill()
})
// The saved profile can arrive a moment after login; fill the form if the user hasn't typed yet
watch(user, (u, old) => {
  if (u && (!old || (!form.role && !form.city && form.name === old.name))) fill()
})

const ALL = 'none'
const cityItems = [{ label: 'Not set', value: ALL }, ...CITIES.map(c => ({ label: c, value: c }))]
const cityModel = computed({
  get: () => form.city || ALL,
  set: (v: string) => { form.city = v === ALL ? '' : v }
})

const phoneOk = computed(() => !form.phone || /^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10)))

async function save() {
  if (form.name.trim().length < 2) {
    toast.add({ title: 'Enter your name', color: 'warning' })
    return
  }
  if (!phoneOk.value) {
    toast.add({ title: 'Enter a valid 10-digit mobile number, or leave it empty', color: 'warning' })
    return
  }
  saving.value = true
  try {
    await updateProfile({ ...form })
    toast.add({ title: 'Profile saved', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Could not save your profile', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function logout() {
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div v-if="!ready || !user" class="py-20 text-center text-stone-500">Loading…</div>

    <template v-else>
      <div class="mb-6 flex items-center gap-4">
        <span class="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-100 text-xl font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
          {{ (form.name || user.name || '?').charAt(0).toUpperCase() }}
        </span>
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-bold">My profile</h1>
          <p class="flex flex-wrap items-center gap-2 text-stone-500">
            <span class="truncate">{{ user.email || 'Demo account' }}</span>
            <UBadge v-if="isAdmin" color="primary" variant="soft" icon="i-lucide-shield-check" label="Super admin" />
          </p>
        </div>
      </div>

      <form class="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8 dark:border-stone-800 dark:bg-stone-900" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Your name" required>
            <UInput v-model="form.name" :maxlength="80" autocomplete="name" class="w-full" />
          </UFormField>
          <UFormField label="Mobile number" hint="Optional" :error="phoneOk ? undefined : 'Enter a 10-digit mobile number'">
            <UInput v-model="form.phone" type="tel" placeholder="10-digit mobile" :maxlength="13" autocomplete="tel" class="w-full" />
          </UFormField>
          <UFormField label="Login email" hint="Can't be changed here" class="sm:col-span-2">
            <UInput :model-value="user.email || '—'" disabled class="w-full" />
          </UFormField>
        </div>
        <p class="-mt-2 text-xs text-stone-500">
          Your mobile number is filled in for you when you post a property. It's only shown on listings you post, and only to logged-in users.
        </p>

        <div>
          <p class="mb-2 text-sm font-medium">I am a…</p>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              v-for="r in USER_ROLES"
              :key="r.value"
              type="button"
              class="flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center text-sm font-medium transition"
              :class="form.role === r.value ? 'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200' : 'border-stone-200 hover:border-stone-300 dark:border-stone-700'"
              :aria-pressed="form.role === r.value"
              @click="form.role = form.role === r.value ? '' : r.value"
            >
              <UIcon :name="r.icon" class="size-6" />
              {{ r.label }}
              <span class="text-[11px] font-normal text-stone-500">{{ r.hint }}</span>
            </button>
          </div>
        </div>

        <UFormField label="City" hint="Where you live or are looking">
          <USelect v-model="cityModel" :items="cityItems" class="w-full sm:w-64" />
        </UFormField>

        <div class="flex flex-wrap justify-between gap-3 border-t border-stone-200 pt-5 dark:border-stone-800">
          <UButton type="submit" icon="i-lucide-save" :loading="saving">Save profile</UButton>
          <div class="flex gap-2">
            <UButton to="/dashboard" color="neutral" variant="outline" icon="i-lucide-house">My listings</UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-log-out" @click="logout">Log out</UButton>
          </div>
        </div>
      </form>
    </template>
  </div>
</template>
