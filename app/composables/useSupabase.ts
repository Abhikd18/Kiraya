import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/** True when Supabase keys are set. Without them Kiraya runs in demo mode. */
export function useHasBackend() {
  const config = useRuntimeConfig()
  return Boolean(config.public.supabaseUrl && config.public.supabaseAnonKey)
}

/** Returns the Supabase client, or null in demo mode. */
export function useSupabase(): SupabaseClient | null {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const key = config.public.supabaseAnonKey as string
  if (!url || !key) return null

  // On the server, create a fresh client per request (no session storage there)
  if (import.meta.server) {
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
    })
  }
  return client
}
