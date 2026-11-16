import type { Listing, ListingStatus } from '#shared/types/listing'
import { COLUMNS, fromRow } from './useListings'

export interface AdminUser {
  id: string
  email: string
  name: string
  blocked: boolean
  createdAt: string
  phone: string
  role: string
  city: string
  listings: number
  live: number
}

export interface AdminReport {
  id: string
  listingId: string
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
  listingTitle: string
  listingStatus: ListingStatus | ''
}

const DAY = 86400000

/** A column the app expects doesn't exist yet: supabase/schema.sql needs to be run again. */
export function isMissingColumn(e: { code?: string, message?: string } | null) {
  return !!e && (e.code === '42703' || e.code === 'PGRST204' || /schema cache|does not exist/i.test(e.message || ''))
}

export const DB_UPDATE_HELP = 'The database needs an update: open Supabase → SQL Editor, paste all of supabase/schema.sql and click Run.'

/**
 * Super-admin tools. Every query here only works for accounts in the "admins" table:
 * the database security rules (supabase/schema.sql) refuse everyone else.
 */
export function useAdmin() {
  const supabase = useSupabase()
  /** True when supabase/schema.sql hasn't been re-run after an app update (a column is missing). */
  const dbOutdated = useState<boolean>('kiraya-db-outdated', () => false)

  function db() {
    if (!supabase) throw new Error('The admin dashboard needs Supabase to be connected.')
    return supabase
  }

  /** All listings, every status, newest first. */
  async function allListings(): Promise<Listing[]> {
    const { data, error } = await db().from('listings').select(COLUMNS).order('created_at', { ascending: false }).limit(1000)
    if (error) throw error
    return (data ?? []).map(fromRow)
  }

  async function setStatus(id: string, status: ListingStatus) {
    const patch: Record<string, unknown> = { status }
    // Publishing gives the listing a fresh 30 days
    if (status === 'live') patch.expires_at = new Date(Date.now() + 30 * DAY).toISOString()
    const { error } = await db().from('listings').update(patch).eq('id', id)
    if (error) throw error
  }

  async function setVerified(id: string, verified: boolean) {
    const { error } = await db().from('listings').update({ verified }).eq('id', id)
    if (error) throw error
  }

  async function removeListing(id: string) {
    const { error } = await db().from('listings').delete().eq('id', id)
    if (error) throw error
  }

  /** All accounts with how many listings each one has. */
  async function allUsers(listings: Listing[]): Promise<AdminUser[]> {
    const full = await db().from('profiles').select('id,email,name,blocked,created_at,phone,role,city').order('created_at', { ascending: false }).limit(1000)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[] | null = full.data
    if (full.error) {
      if (!isMissingColumn(full.error)) throw full.error
      // Database not updated yet: show users without the newer profile fields
      dbOutdated.value = true
      const basic = await db().from('profiles').select('id,email,name,blocked,created_at').order('created_at', { ascending: false }).limit(1000)
      if (basic.error) throw basic.error
      rows = basic.data
    }
    const now = Date.now()
    return (rows ?? []).map((u) => {
      const own = listings.filter(l => l.ownerId === u.id)
      return {
        id: u.id,
        email: u.email ?? '',
        name: u.name ?? '',
        blocked: u.blocked,
        createdAt: u.created_at,
        phone: u.phone ?? '',
        role: u.role ?? '',
        city: u.city ?? '',
        listings: own.length,
        live: own.filter(l => l.status === 'live' && new Date(l.expiresAt).getTime() > now).length
      }
    })
  }

  /** Blocking stops the account from posting and pauses its live listings. */
  async function setBlocked(userId: string, blocked: boolean) {
    const { error } = await db().from('profiles').update({ blocked }).eq('id', userId)
    if (error) throw error
    if (blocked) {
      const { error: pauseError } = await db().from('listings').update({ status: 'paused' }).eq('owner_id', userId).eq('status', 'live')
      if (pauseError) throw pauseError
    }
  }

  async function allReports(): Promise<AdminReport[]> {
    const { data, error } = await db()
      .from('reports')
      .select('id,listing_id,reason,status,created_at,listings(title,status)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      id: r.id,
      listingId: r.listing_id,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      listingTitle: r.listings?.title ?? '(listing deleted)',
      listingStatus: r.listings?.status ?? ''
    }))
  }

  async function setReportStatus(id: string, status: AdminReport['status']) {
    const { error } = await db().from('reports').update({ status }).eq('id', id)
    if (error) throw error
  }

  return { dbOutdated, allListings, setStatus, setVerified, removeListing, allUsers, setBlocked, allReports, setReportStatus }
}
