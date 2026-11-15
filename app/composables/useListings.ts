import type { Listing, ListingFilters, ListingStatus, NewListing } from '#shared/types/listing'
import { DEMO_LISTINGS } from '~/data/demo-listings'

const LOCAL_KEY = 'kiraya-local-listings'
const SAVED_KEY = 'kiraya-saved'
const REPORTS_KEY = 'kiraya-reports'
const DAY = 86400000
// Every column except the private "address" (see supabase/schema.sql), so select('*') is not used
export const COLUMNS = 'id,owner_id,owner_name,posted_by,type,title,description,city,locality,landmark,lat,lng,bhk,bathrooms,area_sqft,floor,total_floors,furnishing,furnishing_items,amenities,tenant_preference,veg_only,pets_allowed,rent,deposit,maintenance,electricity,negotiable,available_from,photos,pg,house_rules,verified,status,views,created_at,expires_at'

// ---------- mapping between the database (snake_case) and the app (camelCase) ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromRow(r: any): Listing {
  return {
    id: r.id,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    ownerPhone: '',
    postedBy: r.posted_by,
    type: r.type,
    title: r.title,
    description: r.description ?? '',
    city: r.city,
    locality: r.locality,
    landmark: r.landmark ?? undefined,
    lat: r.lat,
    lng: r.lng,
    bhk: r.bhk,
    bathrooms: r.bathrooms,
    areaSqft: r.area_sqft ?? undefined,
    floor: r.floor ?? undefined,
    totalFloors: r.total_floors ?? undefined,
    furnishing: r.furnishing,
    furnishingItems: r.furnishing_items ?? [],
    amenities: r.amenities ?? [],
    tenantPreference: r.tenant_preference ?? ['any'],
    vegOnly: r.veg_only,
    petsAllowed: r.pets_allowed,
    rent: r.rent,
    deposit: r.deposit,
    maintenance: r.maintenance ?? 0,
    electricity: r.electricity,
    negotiable: r.negotiable,
    availableFrom: r.available_from,
    photos: r.photos ?? [],
    pg: r.pg ?? undefined,
    houseRules: r.house_rules ?? [],
    verified: r.verified,
    status: r.status,
    views: r.views ?? 0,
    createdAt: r.created_at,
    expiresAt: r.expires_at
  }
}

function toRow(l: NewListing) {
  return {
    owner_name: l.ownerName,
    posted_by: l.postedBy,
    type: l.type,
    title: l.title,
    description: l.description,
    city: l.city,
    locality: l.locality,
    landmark: l.landmark || null,
    address: l.address || null,
    lat: l.lat,
    lng: l.lng,
    bhk: l.bhk,
    bathrooms: l.bathrooms,
    area_sqft: l.areaSqft || null,
    floor: l.floor ?? null,
    total_floors: l.totalFloors ?? null,
    furnishing: l.furnishing,
    furnishing_items: l.furnishingItems,
    amenities: l.amenities,
    tenant_preference: l.tenantPreference,
    veg_only: l.vegOnly,
    pets_allowed: l.petsAllowed,
    rent: l.rent,
    deposit: l.deposit,
    maintenance: l.maintenance,
    electricity: l.electricity,
    negotiable: l.negotiable,
    available_from: l.availableFrom,
    photos: l.photos,
    pg: l.pg ?? null,
    house_rules: l.houseRules
  }
}

// ---------- demo mode storage ----------
function readLocal<T>(key: string, fallback: T): T {
  if (import.meta.server) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new Error('Your browser storage is full. Remove some photos or old listings and try again.')
  }
}

function allDemoListings(): Listing[] {
  return [...readLocal<Listing[]>(LOCAL_KEY, []), ...DEMO_LISTINGS]
}

export function applyFilters(list: Listing[], f: ListingFilters) {
  const q = (f.q || '').trim().toLowerCase()
  let out = list.filter((l) => {
    if (l.status !== 'live') return false
    if (q && ![l.title, l.locality, l.landmark, l.city, l.description].join(' ').toLowerCase().includes(q)) return false
    if (f.city && l.city !== f.city) return false
    if (f.type && l.type !== f.type) return false
    if (f.bhk && (f.bhk >= 4 ? l.bhk < 4 : l.bhk !== f.bhk)) return false
    if (f.minRent && l.rent < f.minRent) return false
    if (f.maxRent && l.rent > f.maxRent) return false
    if (f.furnishing && l.furnishing !== f.furnishing) return false
    if (f.tenant && !(l.tenantPreference.includes(f.tenant) || l.tenantPreference.includes('any'))) return false
    if (f.ownerOnly && l.postedBy !== 'owner') return false
    if (f.verifiedOnly && !l.verified) return false
    return true
  })
  out = [...out].sort((a, b) => {
    if (f.sort === 'price-asc') return a.rent - b.rent
    if (f.sort === 'price-desc') return b.rent - a.rent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  return out
}

// ---------- photos ----------
/** Shrinks a photo in the browser before upload so pages load fast on mobile data. */
export function compressImage(file: File, maxSize = 1280, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not read this photo'))), 'image/jpeg', quality)
    }
    img.onerror = () => reject(new Error('Could not read this photo'))
    img.src = url
  })
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.readAsDataURL(b)
  })
}

// ---------- the composable ----------
export function useListings() {
  const supabase = useSupabase()
  const { user } = useAuth()
  const isDemo = !supabase

  async function search(filters: ListingFilters): Promise<Listing[]> {
    if (!supabase) return applyFilters(allDemoListings(), filters)

    let query = supabase.from('listings').select(COLUMNS).eq('status', 'live').gt('expires_at', new Date().toISOString())
    if (filters.city) query = query.eq('city', filters.city)
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.bhk) query = filters.bhk >= 4 ? query.gte('bhk', 4) : query.eq('bhk', filters.bhk)
    if (filters.minRent) query = query.gte('rent', filters.minRent)
    if (filters.maxRent) query = query.lte('rent', filters.maxRent)
    if (filters.furnishing) query = query.eq('furnishing', filters.furnishing)
    if (filters.tenant) query = query.overlaps('tenant_preference', [filters.tenant, 'any'])
    if (filters.ownerOnly) query = query.eq('posted_by', 'owner')
    if (filters.verifiedOnly) query = query.eq('verified', true)
    if (filters.q) {
      const q = filters.q.replace(/[%,()]/g, ' ').trim()
      if (q) query = query.or(`title.ilike.%${q}%,locality.ilike.%${q}%,landmark.ilike.%${q}%`)
    }
    const ordered = filters.sort === 'price-asc'
      ? query.order('rent', { ascending: true })
      : filters.sort === 'price-desc'
        ? query.order('rent', { ascending: false })
        : query.order('created_at', { ascending: false })

    const { data, error } = await ordered.limit(200)
    if (error) throw error
    return (data ?? []).map(fromRow)
  }

  async function getById(id: string): Promise<Listing | null> {
    if (!supabase) return allDemoListings().find(l => l.id === id) ?? null
    const { data, error } = await supabase.from('listings').select(COLUMNS).eq('id', id).maybeSingle()
    if (error) throw error
    if (data) supabase.rpc('increment_listing_views', { listing_id: id }).then(() => {}, () => {})
    return data ? fromRow(data) : null
  }

  /** Owner phone is only given to logged-in users. */
  async function getOwnerPhone(id: string): Promise<string | null> {
    if (!supabase) return allDemoListings().find(l => l.id === id)?.ownerPhone ?? null
    const { data, error } = await supabase.from('listing_contacts').select('phone').eq('listing_id', id).maybeSingle()
    if (error) throw error
    return data?.phone ?? null
  }

  async function uploadPhotos(files: File[], folder: string): Promise<string[]> {
    const urls: string[] = []
    for (const [i, file] of files.entries()) {
      if (!supabase) {
        const small = await compressImage(file, 800, 0.6)
        urls.push(await blobToDataUrl(small))
        continue
      }
      const blob = await compressImage(file)
      const path = `${folder}/${Date.now()}-${i}.jpg`
      const { error } = await supabase.storage.from('listing-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (error) throw error
      urls.push(supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl)
    }
    return urls
  }

  async function create(input: NewListing, files: File[]): Promise<string> {
    if (!user.value) throw new Error('Please log in to post a property.')
    const folder = user.value.id

    if (!supabase) {
      const photos = await uploadPhotos(files.slice(0, 4), folder)
      const id = 'local-' + Date.now()
      const listing: Listing = {
        ...input,
        photos,
        id,
        ownerId: user.value.id,
        verified: false,
        status: 'live',
        views: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * DAY).toISOString()
      }
      writeLocal(LOCAL_KEY, [listing, ...readLocal<Listing[]>(LOCAL_KEY, [])])
      return id
    }

    const photos = await uploadPhotos(files, folder)
    const { data, error } = await supabase.from('listings').insert({ ...toRow({ ...input, photos }) }).select('id').single()
    // 42501 = blocked by a security rule; for a logged-in user that means an admin blocked the account
    if (error?.code === '42501') throw new Error('Your account is not allowed to post listings. Contact Kiraya support.')
    if (error) throw error
    const { error: contactError } = await supabase.from('listing_contacts').insert({ listing_id: data.id, phone: input.ownerPhone })
    if (contactError) throw contactError
    return data.id as string
  }

  async function mine(): Promise<Listing[]> {
    if (!user.value) return []
    if (!supabase) return readLocal<Listing[]>(LOCAL_KEY, []).filter(l => l.ownerId === user.value!.id)
    const { data, error } = await supabase.from('listings').select(COLUMNS).eq('owner_id', user.value.id).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(fromRow)
  }

  async function setStatus(id: string, status: ListingStatus) {
    if (!supabase) {
      const list = readLocal<Listing[]>(LOCAL_KEY, []).map(l => l.id === id ? { ...l, status } : l)
      writeLocal(LOCAL_KEY, list)
      return
    }
    const patch: Record<string, unknown> = { status }
    if (status === 'live') patch.expires_at = new Date(Date.now() + 30 * DAY).toISOString()
    const { error } = await supabase.from('listings').update(patch).eq('id', id)
    if (error) throw error
  }

  async function remove(id: string) {
    if (!supabase) {
      writeLocal(LOCAL_KEY, readLocal<Listing[]>(LOCAL_KEY, []).filter(l => l.id !== id))
      return
    }
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) throw error
  }

  // Saved (shortlisted) properties are kept in the browser in both modes for the MVP.
  const savedIds = useState<string[]>('kiraya-saved', () => [])
  function loadSaved() {
    savedIds.value = readLocal<string[]>(SAVED_KEY, [])
  }
  function toggleSave(id: string) {
    const set = new Set(readLocal<string[]>(SAVED_KEY, []))
    if (set.has(id)) set.delete(id)
    else set.add(id)
    savedIds.value = [...set]
    writeLocal(SAVED_KEY, savedIds.value)
  }
  async function savedListings(): Promise<Listing[]> {
    loadSaved()
    const ids = savedIds.value
    if (!ids.length) return []
    if (!supabase) return allDemoListings().filter(l => ids.includes(l.id))
    const { data, error } = await supabase.from('listings').select(COLUMNS).in('id', ids)
    if (error) throw error
    return (data ?? []).map(fromRow)
  }

  async function report(id: string, reason: string) {
    if (!supabase) {
      writeLocal(REPORTS_KEY, [...readLocal<unknown[]>(REPORTS_KEY, []), { id, reason, at: new Date().toISOString() }])
      return
    }
    const { error } = await supabase.from('reports').insert({ listing_id: id, reason })
    if (error) throw error
  }

  return { isDemo, search, getById, getOwnerPhone, create, mine, setStatus, remove, savedIds, loadSaved, toggleSave, savedListings, report }
}
