export interface KirayaUser {
  id: string
  email?: string
  name: string
  phone?: string
  demo?: boolean
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

  async function init() {
    if (import.meta.server || ready.value) return
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      user.value = mapUser(data.session?.user)
      await checkAdmin()
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = mapUser(session?.user)
        // Run outside the callback: awaiting Supabase calls inside it can deadlock
        setTimeout(checkAdmin, 0)
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

  async function verifyEmailCode(email: string, token: string) {
    if (!supabase) throw new Error('Email login needs Supabase to be connected.')
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw error
    user.value = mapUser(data.user)
    await checkAdmin()
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

  return { user, ready, isAdmin, init, signInWithGoogle, sendEmailCode, verifyEmailCode, demoSignIn, signOut }
}
