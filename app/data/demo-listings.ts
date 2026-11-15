import type { Listing } from '#shared/types/listing'

// Sample listings shown in demo mode (when Supabase is not connected yet).
// Names and phone numbers are made up.
const day = 86400000
const ago = (d: number) => new Date(Date.now() - d * day).toISOString()
const inDays = (d: number) => new Date(Date.now() + d * day).toISOString()

type Seed = Partial<Listing> & Pick<Listing, 'id' | 'type' | 'title' | 'city' | 'locality' | 'lat' | 'lng' | 'bhk' | 'rent' | 'deposit'>

const base: Omit<Listing, keyof Seed> = {
  ownerId: 'demo-owner',
  ownerName: 'Demo Owner',
  ownerPhone: '9800000000',
  postedBy: 'owner',
  description: '',
  bathrooms: 1,
  furnishing: 'semi-furnished',
  furnishingItems: [],
  amenities: [],
  tenantPreference: ['any'],
  vegOnly: false,
  petsAllowed: false,
  maintenance: 0,
  electricity: 'per-unit',
  negotiable: true,
  availableFrom: new Date().toISOString().slice(0, 10),
  photos: [],
  houseRules: [],
  verified: false,
  status: 'live',
  views: 0,
  createdAt: ago(1),
  expiresAt: inDays(29)
}

const seeds: Seed[] = [
  {
    id: 'demo-1', type: 'flat', title: 'Sunny 2BHK near Sector 35 market', city: 'Chandigarh', locality: 'Sector 35',
    landmark: 'Near Sector 35 market', lat: 30.7225, lng: 76.757, bhk: 2, bathrooms: 2, areaSqft: 1050, floor: 1, totalFloors: 3,
    rent: 22000, deposit: 44000, maintenance: 1000, furnishing: 'semi-furnished',
    furnishingItems: ['Wardrobe', 'Geyser', 'Kitchen cabinets', 'RO water'], amenities: ['Car parking', 'Power backup', 'Balcony'],
    tenantPreference: ['family', 'working'], verified: true, ownerName: 'Gurpreet Singh', ownerPhone: '9800000001', views: 214, createdAt: ago(2),
    description: 'First-floor 2BHK in a quiet lane, 2 minutes from Sector 35 market. Good sunlight, separate entry, covered car parking. Family or working couple preferred.'
  },
  {
    id: 'demo-2', type: 'pg', title: 'Boys PG with food, walking distance to Chandigarh University', city: 'Kharar', locality: 'Gharuan',
    landmark: 'Chandigarh University gate 1', lat: 30.769, lng: 76.575, bhk: 1, rent: 8500, deposit: 8500, electricity: 'included',
    furnishing: 'fully-furnished', furnishingItems: ['Bed', 'Study table', 'Wardrobe', 'AC', 'Geyser'], amenities: ['Wi-Fi', 'Power backup', 'Security / CCTV', 'Water 24x7'],
    tenantPreference: ['bachelor-boys', 'students'], pg: { sharing: 'double', bedsAvailable: 6, food: 'veg', mealsPerDay: 3, gateClosing: '10:30 pm' },
    houseRules: ['No smoking', 'No drinking'], verified: true, ownerName: 'Harjit Kaur', ownerPhone: '9800000002', views: 532, createdAt: ago(1),
    description: 'Double-sharing AC rooms, 3 veg meals a day, Wi-Fi and daily cleaning. 5 minutes walk to CU. Laundry twice a week included.'
  },
  {
    id: 'demo-3', type: 'flat', title: '1BHK near IT City, ideal for working professionals', city: 'Mohali', locality: 'Sector 82, IT City',
    landmark: 'Near IT City chowk', lat: 30.6545, lng: 76.7305, bhk: 1, bathrooms: 1, areaSqft: 600, floor: 4, totalFloors: 12,
    rent: 14000, deposit: 28000, maintenance: 1500, furnishing: 'fully-furnished',
    furnishingItems: ['Bed', 'Wardrobe', 'AC', 'Fridge', 'Washing machine', 'Geyser'], amenities: ['Lift', 'Gated society', 'Gym', 'Power backup', 'Car parking'],
    tenantPreference: ['working'], ownerName: 'Ankit Sharma', ownerPhone: '9800000003', views: 148, createdAt: ago(3),
    description: 'Fully furnished 1BHK in a gated society, 5 minutes from IT City offices. Move-in ready.'
  },
  {
    id: 'demo-4', type: 'independent-floor', title: '3BHK ground floor with lawn, Sector 20 Panchkula', city: 'Panchkula', locality: 'Sector 20',
    lat: 30.673, lng: 76.859, bhk: 3, bathrooms: 3, areaSqft: 1800, floor: 0, totalFloors: 2, rent: 32000, deposit: 64000,
    furnishing: 'unfurnished', amenities: ['Car parking', 'Park nearby', 'Separate entry', 'Water 24x7'], tenantPreference: ['family'], vegOnly: true,
    verified: true, ownerName: 'Ramesh Goyal', ownerPhone: '9800000004', views: 97, createdAt: ago(5),
    description: 'Spacious ground floor with front lawn and two car parking spaces. Family only, vegetarian preferred.'
  },
  {
    id: 'demo-5', type: 'room', title: 'Single room near Panjab University, Sector 15', city: 'Chandigarh', locality: 'Sector 15',
    landmark: 'Near PU gate 2', lat: 30.759, lng: 76.77, bhk: 1, rent: 7000, deposit: 7000, furnishing: 'semi-furnished',
    furnishingItems: ['Bed', 'Study table'], amenities: ['Wi-Fi', 'Bike parking'], tenantPreference: ['students'],
    ownerName: 'Sunita Verma', ownerPhone: '9800000005', views: 301, createdAt: ago(0),
    description: 'Room on the second floor with attached washroom. Ideal for PU students. Kitchen sharing allowed.'
  },
  {
    id: 'demo-6', type: 'flat', title: '2BHK on VIP Road with society amenities', city: 'Zirakpur', locality: 'VIP Road',
    lat: 30.643, lng: 76.818, bhk: 2, bathrooms: 2, areaSqft: 1150, floor: 7, totalFloors: 14, rent: 16500, deposit: 33000, maintenance: 2500,
    furnishing: 'semi-furnished', furnishingItems: ['Wardrobe', 'Geyser', 'Kitchen cabinets'], amenities: ['Lift', 'Gated society', 'Gym', 'Power backup', 'Car parking', 'Security / CCTV'],
    tenantPreference: ['family', 'working'], postedBy: 'broker', ownerName: 'Tricity Homes (broker)', ownerPhone: '9800000006', views: 88, createdAt: ago(6),
    description: 'Well maintained 2BHK in a gated society on VIP Road. Clubhouse and pool. Brokerage: 15 days rent.'
  },
  {
    id: 'demo-7', type: 'pg', title: 'Girls PG with meals, Sector 22', city: 'Chandigarh', locality: 'Sector 22',
    landmark: 'Near Sector 22 bus stand', lat: 30.7333, lng: 76.7794, bhk: 1, rent: 11000, deposit: 11000, electricity: 'included',
    furnishing: 'fully-furnished', furnishingItems: ['Bed', 'Wardrobe', 'AC', 'Study table', 'Geyser'], amenities: ['Wi-Fi', 'Security / CCTV', 'Power backup'],
    tenantPreference: ['bachelor-girls', 'students', 'working'], pg: { sharing: 'triple', bedsAvailable: 3, food: 'veg', mealsPerDay: 2, gateClosing: '9:30 pm' },
    houseRules: ['No smoking', 'No visitors at night'], verified: true, ownerName: 'Neha Arora', ownerPhone: '9800000007', views: 410, createdAt: ago(2),
    description: 'Safe girls PG with warden on site, CCTV and biometric entry. Breakfast and dinner included.'
  },
  {
    id: 'demo-8', type: 'flat', title: 'Budget 1BHK in Kharar near Landran Road', city: 'Kharar', locality: 'Landran Road',
    lat: 30.7466, lng: 76.646, bhk: 1, bathrooms: 1, areaSqft: 550, floor: 2, totalFloors: 4, rent: 8000, deposit: 16000,
    furnishing: 'unfurnished', amenities: ['Bike parking', 'Water 24x7'], tenantPreference: ['any'],
    ownerName: 'Balwinder Singh', ownerPhone: '9800000008', views: 65, createdAt: ago(8),
    description: 'Affordable 1BHK, 10 minutes from Kharar bus stand. Good for small families or two working friends.'
  },
  {
    id: 'demo-9', type: 'flat', title: '3BHK furnished flat, Mohali Phase 7', city: 'Mohali', locality: 'Phase 7',
    landmark: 'Near Phase 7 market', lat: 30.711, lng: 76.719, bhk: 3, bathrooms: 2, areaSqft: 1450, floor: 1, totalFloors: 2,
    rent: 28000, deposit: 56000, furnishing: 'fully-furnished', furnishingItems: ['Bed', 'Wardrobe', 'AC', 'Fridge', 'Sofa', 'Dining table', 'Washing machine'],
    amenities: ['Car parking', 'Power backup', 'Park nearby', 'Balcony'], tenantPreference: ['family'], petsAllowed: true,
    verified: true, ownerName: 'Kulwant Sandhu', ownerPhone: '9800000009', views: 176, createdAt: ago(4),
    description: 'Fully furnished first floor in a kothi, close to Phase 7 market and Fortis hospital road. Pets welcome.'
  },
  {
    id: 'demo-10', type: 'shared-room', title: 'Shared room for working men, Sector 70', city: 'Mohali', locality: 'Sector 70',
    lat: 30.698, lng: 76.713, bhk: 1, rent: 5500, deposit: 5500, electricity: 'per-unit', furnishing: 'semi-furnished',
    furnishingItems: ['Bed', 'Wardrobe'], amenities: ['Wi-Fi', 'Bike parking'], tenantPreference: ['bachelor-boys', 'working'],
    ownerName: 'Vikas Kumar', ownerPhone: '9800000010', views: 59, createdAt: ago(1),
    description: 'One bed available in a 2-person room. Shared kitchen. Looking for a working professional.'
  },
  {
    id: 'demo-11', type: 'house', title: 'Independent kothi, Sector 9 Panchkula', city: 'Panchkula', locality: 'Sector 9',
    lat: 30.6935, lng: 76.8535, bhk: 4, bathrooms: 4, areaSqft: 3200, floor: 0, totalFloors: 2, rent: 65000, deposit: 130000,
    furnishing: 'semi-furnished', amenities: ['Car parking', 'Power backup', 'Park nearby', 'Separate entry', 'Security / CCTV'],
    tenantPreference: ['family'], verified: true, ownerName: 'Col. R. S. Malik (retd.)', ownerPhone: '9800000011', views: 44, createdAt: ago(10),
    description: 'Full kothi with servant quarter, 2 car garage and garden. Suitable for a large family or company guest house.'
  },
  {
    id: 'demo-12', type: 'flat', title: '2BHK in New Chandigarh, Omaxe area', city: 'New Chandigarh', locality: 'Mullanpur',
    lat: 30.788, lng: 76.732, bhk: 2, bathrooms: 2, areaSqft: 1200, floor: 3, totalFloors: 10, rent: 15000, deposit: 30000, maintenance: 2000,
    furnishing: 'semi-furnished', amenities: ['Lift', 'Gated society', 'Power backup', 'Car parking', 'Park nearby'], tenantPreference: ['family', 'working'],
    ownerName: 'Pooja Bansal', ownerPhone: '9800000012', views: 31, createdAt: ago(3),
    description: 'Green, peaceful township, 15 minutes to Sector 17 via PGI road. Society has kids play area and power backup.'
  }
]

export const DEMO_LISTINGS: Listing[] = seeds.map(s => ({ ...base, ...s } as Listing))
