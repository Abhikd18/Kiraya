<script setup lang="ts">
useSeoMeta({ title: 'Log in | Kiraya' })

const route = useRoute()
const nextPath = computed(() => (typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/dashboard'))
const hasBackend = useHasBackend()
const { user, init, signInWithGoogle, sendEmailCode, verifyEmailCode, signInWithPassword, demoSignIn } = useAuth()
const toast = useToast()
const authError = useState<string>('kiraya-auth-error', () => '')

const email = ref('')
const password = ref('')
const showPassword = ref(false)
/** 'link' = email me a login link, 'password' = email + password */
const mode = ref<'link' | 'password'>('link')
const code = ref('')
const name = ref('')
const codeSent = ref(false)
const loading = ref(false)

// Show "Continue with Google" only once Google is switched on in Supabase
// (otherwise the button leads to a raw "provider is not enabled" error page)
const googleEnabled = ref(false)
const config = useRuntimeConfig()
async function checkGoogle() {
  try {
    const s = await $fetch<{ external?: { google?: boolean } }>(`${config.public.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: config.public.supabaseAnonKey as string }
    })
    googleEnabled.value = s.external?.google === true
  } catch {
    googleEnabled.value = false
  }
}

onMounted(async () => {
  if (hasBackend) checkGoogle()
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
    authError.value = ''
    toast.add({ title: 'Email sent', description: `Open the email we sent to ${email.value} and tap "Sign in".`, color: 'success' })
  } catch (e) {
    const msg = (e as Error).message
    toast.add({
      title: 'Could not send the login email',
      description: /rate limit/i.test(msg)
        ? `Too many login emails were sent in the last hour. Please wait a while and try again${googleEnabled.value ? ', or continue with Google' : ''}.`
        : msg,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function passwordLogin() {
  if (!/^\S+@\S+\.\S+$/.test(email.value) || !password.value) {
    toast.add({ title: 'Enter your email and password', color: 'warning' })
    return
  }
  loading.value = true
  try {
    await signInWithPassword(email.value.trim(), password.value)
    authError.value = ''
  } catch (e) {
    toast.add({ title: 'Could not log in', description: (e as Error).message, color: 'error' })
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
        <p v-if="authError" class="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <UIcon name="i-lucide-circle-alert" class="mt-0.5 size-4 shrink-0" />
          {{ authError }}
        </p>
        <template v-if="googleEnabled">
          <UButton block size="lg" color="neutral" variant="outline" icon="i-simple-icons-google" :loading="loading" @click="google">
            Continue with Google
          </UButton>
        </template>

        <div v-if="googleEnabled" class="my-5 flex items-center gap-3 text-xs text-stone-400">
          <span class="h-px flex-1 bg-stone-200 dark:bg-stone-700" /> or use email <span class="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        </div>

        <form v-if="!codeSent && mode === 'link'" class="space-y-3" @submit.prevent="sendCode">
          <UFormField label="Email">
            <UInput v-model="email" type="email" placeholder="you@example.com" size="lg" class="w-full" autocomplete="email" />
          </UFormField>
          <UButton type="submit" block size="lg" :loading="loading">Email me a login link</UButton>
          <UButton block variant="link" color="neutral" icon="i-lucide-lock" @click="mode = 'password'">Log in with email and password</UButton>
        </form>

        <form v-else-if="!codeSent" class="space-y-3" @submit.prevent="passwordLogin">
          <UFormField label="Email">
            <UInput v-model="email" type="email" placeholder="you@example.com" size="lg" class="w-full" autocomplete="username" />
          </UFormField>
          <UFormField label="Password">
            <UInput
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              size="lg"
              class="w-full"
              autocomplete="current-password"
              :ui="{ trailing: 'pe-1' }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>
          <UButton type="submit" block size="lg" :loading="loading">Log in</UButton>
          <p class="text-center text-xs text-stone-500">
            No password yet, or forgot it? Use the email link or Google, then set a new one in <strong>My profile</strong>.
          </p>
          <UButton block variant="link" color="neutral" icon="i-lucide-mail" @click="mode = 'link'">Email me a login link instead</UButton>
        </form>

        <form v-else class="space-y-3" @submit.prevent="verify">
          <p class="rounded-lg bg-stone-50 p-3 text-sm text-stone-600 dark:bg-stone-950 dark:text-stone-300">
            We emailed a sign-in link to <strong>{{ email }}</strong>. Open it on this device to log in.
            If the email shows a code instead, enter it below.
          </p>
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
