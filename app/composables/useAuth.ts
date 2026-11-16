export type UserRole = 'tenant' | 'student' | 'owner' | 'broker'

export interface KirayaUser {
  id: string
  email?: string
  name: string
  phone?: string
  role?: UserRole
  city?: string
  demo?: boolean
}

export interface ProfileInput {
  name: string
  phone: string
  role: UserRole | ''
  city: string
}

const DEMO_USER_KEY = 'kiraya-demo-user'

export function useAuth() {
  const user = useState<KirayaUser | null>('kiraya-user', () => null)
  const ready = useState<boolean>('kiraya-auth-ready', () => false)
  const isAdmin = useState<boolean>('kiraya-is-admin', () => false)
  const supabase = useSupabase()
  const config = useRuntimeConfig()

  /** Super admins are listed in the "admins" table (see supabase/schema.sql). */
  async function checkAdmin() {
    if (!supabase || !user.value) {
      isAdmin.value = false
      return
    }
    const { data } = await supabase.rpc('is_admin')
    isAdmin.value = data === true
  }

  /** Name, phone, role and city the user saved on "My profile" (profiles table). */
  async function loadProfile() {
    if (!supabase || !user.value) return
    const { data } = await supabase.from('profiles').select('name,phone,role,city').eq('id', user.value.id).maybeSingle()
    if (data && user.value) {
      user.value = {
        ...user.value,
        name: data.name || user.value.name,
        phone: data.phone || user.value.phone,
        role: data.role || undefined,
        city: data.city || undefined
      }
    }
  }

  async function afterLogin() {
    await Promise.all([checkAdmin(), loadProfile()])
  }

  async function init() {
    if (import.meta.server || ready.value) return
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      user.value = mapUser(data.session?.user)
      await afterLogin()
      supabase.auth.onAuthStateChange((_event, session) => {
        const next = mapUser(session?.user)
        // Same person (e.g. token refresh): keep the profile details already loaded
        user.value = next && user.value?.id === next.id ? { ...next, ...pickProfile(user.value) } : next
        // Run outside the callback: awaiting Supabase calls inside it can deadlock
        setTimeout(afterLogin, 0)
      })
    } else {
      try {
        const raw = localStorage.getItem(DEMO_USER_KEY)
        user.value = raw ? JSON.parse(raw) : null
      } catch {
        user.value = null
      }
    }
    ready.value = true
  }

  function pickProfile(u: KirayaUser) {
    return { name: u.name, phone: u.phone, role: u.role, city: u.city }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapUser(u: any): KirayaUser | null {
    if (!u) return null
    const meta = u.user_metadata || {}
    return {
      id: u.id,
      email: u.email,
      phone: meta.phone,
      name: meta.full_name || meta.name || (u.email ? u.email.split('@')[0] : 'Kiraya user')
    }
  }

  /** Saves "My profile". Works in Supabase mode and in demo mode. */
  async function updateProfile(p: ProfileInput) {
    if (!user.value) throw new Error('Please log in first.')
    const clean = {
      name: p.name.trim(),
      phone: p.phone.replace(/\D/g, '').slice(-10),
      role: p.role || null,
      city: p.city || null
    }
    if (supabase) {
      const { data, error } = await supabase.from('profiles').update(clean).eq('id', user.value.id).select('id')
      if (error && (error.code === '42703' || error.code === 'PGRST204' || /schema cache/i.test(error.message))) {
        throw new Error('Kiraya was just updated and its database needs the matching update. Please try again later. (Admin: run supabase/schema.sql in Supabase → SQL Editor.)')
      }
      if (error) throw error
      if (!data?.length) throw new Error('Your profile could not be saved. Please log out and in again.')
      // Keep the login details in step so the name shows everywhere straight away
      await supabase.auth.updateUser({ data: { full_name: clean.name, phone: clean.phone } })
    }
    user.value = { ...user.value, name: clean.name, phone: clean.phone || undefined, role: clean.role ?? undefined, city: clean.city ?? undefined }
    if (!supabase) localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user.value))
  }

  function redirectUrl(path = '/dashboard') {
    const base = import.meta.client ? window.location.origin : config.public.siteUrl
    return base + path
  }

  async function signInWithGoogle(next = '/dashboard') {
    if (!supabase) throw new Error('Google login needs Supabase to be connected.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl(next) }
    })
    if (error) throw error
  }

  async function sendEmailCode(email: string, next = '/dashboard') {
    if (!supabase) throw new Error('Email login needs Supabase to be connected.')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl(next), shouldCreateUser: true }
    })
    if (error) throw error
  }

  /** Log in with the password the user set on "My profile". */
  async function signInWithPassword(email: string, password: string) {
    if (!supabase) throw new Error('Password login needs Supabase to be connected.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (/invalid login credentials/i.test(error.message)) {
        throw new Error('Wrong email or password. If you have never set a password, log in with Google or an email link first, then set one in My profile.')
      }
      throw error
    }
    user.value = mapUser(data.user)
    await afterLogin()
  }

  /** Sets a password the first time, or changes it later. The user must be logged in. */
  async function changePassword(password: string) {
    if (!supabase) throw new Error('Passwords need Supabase to be connected.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      if (/different from the old/i.test(error.message)) throw new Error('The new password must be different from your current one.')
      if (/reauthentication|recent login/i.test(error.message)) throw new Error('For your safety, please log out and log in again, then change your password.')
      if (/weak|pwned|leaked/i.test(error.message)) throw new Error('This password is too easy to guess. Use a longer one with letters and numbers.')
      throw error
    }
  }

  async function verifyEmailCode(email: string, token: string) {
    if (!supabase) throw new Error('Email login needs Supabase to be connected.')
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw error
    user.value = mapUser(data.user)
    await afterLogin()
  }

  function demoSignIn(name: string, email: string) {
    const u: KirayaUser = { id: 'demo-user', name: name || 'Demo user', email, demo: true }
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(u))
    user.value = u
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    else localStorage.removeItem(DEMO_USER_KEY)
    user.value = null
    isAdmin.value = false
  }

  return { user, ready, isAdmin, init, updateProfile, signInWithPassword, changePassword, signInWithGoogle, sendEmailCode, verifyEmailCode, demoSignIn, signOut }
}
