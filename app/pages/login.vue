<script setup lang="ts">
useSeoMeta({ title: 'Log in | Kiraya' })

const route = useRoute()
const nextPath = computed(() => (typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/dashboard'))
const hasBackend = useHasBackend()
const { user, init, signInWithGoogle, sendEmailCode, verifyEmailCode, demoSignIn } = useAuth()
const toast = useToast()

const email = ref('')
const code = ref('')
const name = ref('')
const codeSent = ref(false)
const loading = ref(false)

onMounted(async () => {
  await init()
  if (user.value) navigateTo(nextPath.value)
})

watch(user, (u) => {
  if (u) navigateTo(nextPath.value)
})

async function google() {
  loading.value = true
  try {
    await signInWithGoogle(nextPath.value)
  } catch (e) {
    toast.add({ title: 'Google login failed', description: (e as Error).message, color: 'error' })
    loading.value = false
  }
}

async function sendCode() {
  if (!/^\S+@\S+\.\S+$/.test(email.value)) {
    toast.add({ title: 'Enter a valid email address', color: 'warning' })
    return
  }
  loading.value = true
  try {
    await sendEmailCode(email.value.trim(), nextPath.value)
    codeSent.value = true
    toast.add({ title: 'Code sent', description: `Check ${email.value} for your 6-digit code.`, color: 'success' })
  } catch (e) {
    toast.add({ title: 'Could not send code', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function verify() {
  loading.value = true
  try {
    await verifyEmailCode(email.value.trim(), code.value.trim())
  } catch (e) {
    toast.add({ title: 'Wrong or expired code', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

function demoLogin() {
  demoSignIn(name.value.trim() || 'Demo owner', email.value.trim())
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <div class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-900">
      <div class="mb-6 text-center">
        <span class="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-orange-600 text-white">
          <UIcon name="i-lucide-key-round" class="size-6" />
        </span>
        <h1 class="text-2xl font-bold">Welcome to Kiraya</h1>
        <p class="text-sm text-stone-500">Log in to contact owners and post your property.</p>
      </div>

      <template v-if="hasBackend">
        <UButton block size="lg" color="neutral" variant="outline" icon="i-simple-icons-google" :loading="loading" @click="google">
          Continue with Google
        </UButton>

        <div class="my-5 flex items-center gap-3 text-xs text-stone-400">
          <span class="h-px flex-1 bg-stone-200 dark:bg-stone-700" /> or use email <span class="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        </div>

        <form v-if="!codeSent" class="space-y-3" @submit.prevent="sendCode">
          <UFormField label="Email">
            <UInput v-model="email" type="email" placeholder="you@example.com" size="lg" class="w-full" autocomplete="email" />
          </UFormField>
          <UButton type="submit" block size="lg" :loading="loading">Send me a login code</UButton>
        </form>

        <form v-else class="space-y-3" @submit.prevent="verify">
          <UFormField :label="`Code sent to ${email}`">
            <UInput v-model="code" inputmode="numeric" placeholder="6-digit code" size="lg" class="w-full" :maxlength="8" autocomplete="one-time-code" />
          </UFormField>
          <UButton type="submit" block size="lg" :loading="loading">Verify and log in</UButton>
          <UButton block variant="link" color="neutral" @click="codeSent = false">Use a different email</UButton>
        </form>
      </template>

      <template v-else>
        <p class="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Demo mode: Google and email login switch on once Supabase is connected. For now, enter any name to try the app.
        </p>
        <form class="space-y-3" @submit.prevent="demoLogin">
          <UFormField label="Your name">
            <UInput v-model="name" placeholder="e.g. Abhishek" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Email" hint="Optional">
            <UInput v-model="email" type="email" size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" block size="lg">Continue in demo mode</UButton>
        </form>
      </template>

      <p class="mt-6 text-center text-xs text-stone-500">
        By continuing you agree to our <NuxtLink to="/terms" class="underline">terms</NuxtLink> and
        <NuxtLink to="/privacy" class="underline">privacy policy</NuxtLink>.
      </p>
    </div>
  </div>
</template>
