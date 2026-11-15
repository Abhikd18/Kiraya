import type { City, Furnishing, PropertyType, TenantPreference } from '#shared/types/listing'

export const CITIES: City[] = ['Chandigarh', 'Mohali', 'Panchkula', 'Zirakpur', 'Kharar', 'New Chandigarh']

export const PROPERTY_TYPES: { value: PropertyType, label: string, icon: string }[] = [
  { value: 'flat', label: 'Flat / Apartment', icon: 'i-lucide-building-2' },
  { value: 'independent-floor', label: 'Independent floor', icon: 'i-lucide-layers' },
  { value: 'house', label: 'House / Kothi', icon: 'i-lucide-house' },
  { value: 'pg', label: 'PG / Hostel', icon: 'i-lucide-bed-double' },
  { value: 'room', label: 'Single room', icon: 'i-lucide-door-open' },
  { value: 'shared-room', label: 'Shared room', icon: 'i-lucide-users' }
]

export const FURNISHING: { value: Furnishing, label: string }[] = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi-furnished', label: 'Semi-furnished' },
  { value: 'fully-furnished', label: 'Fully furnished' }
]

export const TENANT_PREFS: { value: TenantPreference, label: string }[] = [
  { value: 'any', label: 'Anyone' },
  { value: 'family', label: 'Family' },
  { value: 'bachelor-boys', label: 'Bachelor boys' },
  { value: 'bachelor-girls', label: 'Bachelor girls' },
  { value: 'students', label: 'Students' },
  { value: 'working', label: 'Working professionals' }
]

export const AMENITIES = [
  'Bike parking', 'Car parking', 'Power backup', 'Lift', 'Security / CCTV', 'Gated society',
  'Wi-Fi', 'Gym', 'Park nearby', 'Water 24x7', 'Balcony', 'Separate entry'
]

export const FURNISHING_ITEMS = [
  'Bed', 'Wardrobe', 'AC', 'Fridge', 'Washing machine', 'Geyser', 'RO water', 'TV', 'Sofa',
  'Dining table', 'Kitchen cabinets', 'Gas stove', 'Microwave', 'Study table'
]

export const HOUSE_RULES = [
  'No smoking', 'No drinking', 'No loud music after 10 pm', 'Visitors allowed', 'No visitors at night',
  '1 month notice period', 'Minimum stay 6 months', 'Minimum stay 11 months'
]

export const POPULAR_SEARCHES = [
  { label: 'PG near Chandigarh University', query: { q: 'Gharuan', type: 'pg' } },
  { label: '1BHK in Mohali', query: { city: 'Mohali', bhk: '1' } },
  { label: 'Rooms near PU, Sector 15', query: { q: 'Sector 15', city: 'Chandigarh' } },
  { label: '2BHK in Zirakpur', query: { city: 'Zirakpur', bhk: '2' } },
  { label: 'Girls PG in Chandigarh', query: { city: 'Chandigarh', type: 'pg', tenant: 'bachelor-girls' } },
  { label: 'Family flats in Panchkula', query: { city: 'Panchkula', tenant: 'family' } }
]

export function typeLabel(t: PropertyType) {
  return PROPERTY_TYPES.find(p => p.value === t)?.label ?? t
}

export function furnishingLabel(f: Furnishing) {
  return FURNISHING.find(p => p.value === f)?.label ?? f
}

export function tenantLabel(t: TenantPreference) {
  return TENANT_PREFS.find(p => p.value === t)?.label ?? t
}

export function formatRent(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export function listingHeadline(l: { type: PropertyType, bhk: number, pg?: { sharing: string } }) {
  if (l.type === 'pg') return `PG${l.pg ? ' · ' + l.pg.sharing + ' sharing' : ''}`
  if (l.type === 'room' || l.type === 'shared-room') return typeLabel(l.type)
  return `${l.bhk} BHK ${typeLabel(l.type)}`
}
