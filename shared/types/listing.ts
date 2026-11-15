export type City = 'Chandigarh' | 'Mohali' | 'Panchkula' | 'Zirakpur' | 'Kharar' | 'New Chandigarh'

export type PropertyType =
  | 'flat'
  | 'independent-floor'
  | 'house'
  | 'pg'
  | 'room'
  | 'shared-room'

export type Furnishing = 'unfurnished' | 'semi-furnished' | 'fully-furnished'

export type TenantPreference =
  | 'any'
  | 'family'
  | 'bachelor-boys'
  | 'bachelor-girls'
  | 'students'
  | 'working'

export type ListingStatus = 'live' | 'pending' | 'rented' | 'paused' | 'expired'

export type ElectricityBilling = 'included' | 'per-unit' | 'meter'

export interface PgDetails {
  sharing: 'single' | 'double' | 'triple' | 'mixed'
  bedsAvailable: number
  food: 'none' | 'veg' | 'veg-nonveg'
  mealsPerDay: number
  gateClosing?: string
}

export interface Listing {
  id: string
  ownerId: string
  ownerName: string
  ownerPhone: string
  postedBy: 'owner' | 'broker'
  type: PropertyType
  title: string
  description: string
  city: City
  locality: string
  landmark?: string
  address?: string
  lat: number
  lng: number
  bhk: number
  bathrooms: number
  areaSqft?: number
  floor?: number
  totalFloors?: number
  furnishing: Furnishing
  furnishingItems: string[]
  amenities: string[]
  tenantPreference: TenantPreference[]
  vegOnly: boolean
  petsAllowed: boolean
  rent: number
  deposit: number
  maintenance: number
  electricity: ElectricityBilling
  negotiable: boolean
  availableFrom: string
  photos: string[]
  pg?: PgDetails
  houseRules: string[]
  verified: boolean
  status: ListingStatus
  views: number
  createdAt: string
  expiresAt: string
}

export type NewListing = Omit<Listing, 'id' | 'ownerId' | 'verified' | 'status' | 'views' | 'createdAt' | 'expiresAt'>

export interface ListingFilters {
  q?: string
  city?: City | ''
  type?: PropertyType | ''
  bhk?: number | null
  minRent?: number | null
  maxRent?: number | null
  furnishing?: Furnishing | ''
  tenant?: TenantPreference | ''
  ownerOnly?: boolean
  verifiedOnly?: boolean
  sort?: 'newest' | 'price-asc' | 'price-desc'
}
