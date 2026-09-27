import type { Payload } from 'payload'
import { EXPERIENCE_MEDIA_MANIFEST } from '../content/manifests/media-manifest'

function toLexical(text: string) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              text: text || '',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal' as const,
              style: '',
            },
          ],
          direction: 'ltr' as const,
        },
      ],
      direction: 'ltr' as const,
    },
  } as any
}

export interface ExperienceStaySeedDef {
  order: number
  propertySlug: string
  nights: number
  roomCategory: string
  boardBasis: 'bed_and_breakfast' | 'half_board' | 'full_board' | 'all_inclusive'
  pricingUnit: 'per_stay' | 'per_night'
  roomRates: {
    occupancy: 'single' | 'double' | 'triple' | 'quad'
    rateEGP: number
    enabled: boolean
  }[]
}

export interface ExperienceItineraryDaySeedDef {
  dayNumber: number
  title: string
  citySlug?: string
  description: string
}

export interface ExperienceSeedDef {
  title: string
  slug: string
  heroAssetKey?: string
  galleryAssetKeys?: string[]
  type: 'daily_tour' | 'package'
  packageMode?: 'fixed_date' | 'flexible_date'
  citySlug: string // Origin Gateway
  destinationSlugs?: string[] // Post-Origin ordered destinations (strictly excluding origin)
  price: number // Approved Initial Commercial Baseline Price in EGP
  availability: 'available' | 'sold_out' | 'coming_soon' | 'unavailable'
  duration: {
    days?: number
    nights?: number
    durationMinutes?: number
  }
  description: string
  policies: string
  included: string[]
  excluded: string[]
  itinerary: ExperienceItineraryDaySeedDef[]
  accommodations?: ExperienceStaySeedDef[]
  childPolicy?: {
    childrenAllowed: boolean
    childSharingBedPercentage?: number
    childExtraBedPercentage?: number
  }
  seo: {
    title: string
    description: string
    keywords: string
  }
}

/**
 * The 11 Canonical Curated Experiences for L'Aube Voyage.
 * Normalized and verified against the 21 canonical accommodation properties in catalog.
 */
export const CANONICAL_EXPERIENCES: ExperienceSeedDef[] = [
  // =========================================================================
  // GROUP 1: EGYPT CORE (6 Experiences)
  // =========================================================================

  // 1. EXP-EG-01: Giza Pyramids & Grand Egyptian Museum Private Experience
  {
    title: 'Giza Pyramids & Grand Egyptian Museum Private Experience',
    slug: 'giza-pyramids-gem-private-tour',
    heroAssetKey: 'exp-hero-giza-pyramids-gem',
    galleryAssetKeys: ['exp-gallery-gem-grand-atrium', 'exp-gallery-giza-sphinx-sunset'],
    type: 'daily_tour',
    citySlug: 'cairo',
    destinationSlugs: [],
    price: 9500,
    availability: 'available',
    duration: {
      durationMinutes: 480, // 8 Hours (1 Day)
    },
    description:
      'An uncompromising private luxury exploration of ancient Egypt’s crown jewels. Led by a senior certified Egyptologist, ascend the Giza Plateau for private access to the Great Pyramids and Sphinx, followed by a curated VIP journey through the Grand Egyptian Museum and fine dining overlooking the monuments.',
    policies:
      'Full refund for cancellations requested at least 24 hours prior to scheduled tour departure. Instant booking confirmation upon checkout with 24/7 dedicated concierge assistance.',
    included: [
      'Senior Certified Egyptologist Private Guide (Fluent in Preferred Language)',
      'Luxury Executive Mercedes-Benz V-Class Chauffeur Transport throughout the Day',
      'All Giza Plateau Monument and Grand Egyptian Museum VIP Fast-Track Admissions',
      'Gourmet 3-Course Lunch at Khufu’s or 9 Pyramids Lounge overlooking the Pyramids',
      'Chilled Mineral Water, Fresh Juices and Artisan Refreshments Onboard',
    ],
    excluded: [
      'Interior Burial Chamber Admission for the Great Pyramid of Khufu (Available on Concierge Request)',
      'Discretionary Gratuities for Private Guide and Chauffeur',
      'Personal Retail Purchases and Souvenirs',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'The Immortal Giza Plateau & Grand Egyptian Museum Exploration',
        citySlug: 'cairo',
        description:
          'Private guided exploration covering the Great Pyramid of Khufu, Khafre, Menkaure, the panoramic desert viewpoint, the Great Sphinx, the Valley Temple, and the world-class galleries of the Grand Egyptian Museum.',
      },
    ],
    seo: {
      title: "Giza Pyramids & Grand Egyptian Museum Private Experience | L'Aube Voyage",
      description:
        'Book an exclusive private luxury tour to the Giza Pyramids and GEM with senior Egyptologist guide and private executive Mercedes transport.',
      keywords: 'Giza Pyramids private tour, Grand Egyptian Museum VIP, Cairo day tour, luxury Egypt guide, GEM private experience',
    },
  },

  // 2. EXP-EG-02: Cairo Royal Antiquities Immersion (4D/3N)
  {
    title: 'Cairo Royal Antiquities Immersion',
    slug: 'cairo-pyramids-royal-antiquities-immersion',
    heroAssetKey: 'exp-hero-mena-house-pyramids',
    galleryAssetKeys: ['exp-gallery-mena-house-interior', 'exp-gallery-saqqara-step-pyramid'],
    type: 'package',
    packageMode: 'flexible_date',
    citySlug: 'cairo',
    destinationSlugs: [],
    price: 50000,
    availability: 'available',
    duration: {
      days: 4,
      nights: 3,
    },
    childPolicy: {
      childrenAllowed: true,
      childSharingBedPercentage: 50,
      childExtraBedPercentage: 75,
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'marriott-mena-house-cairo',
        nights: 3,
        roomCategory: 'Deluxe Room, Pyramid View, Balcony',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 60000, enabled: true },
          { occupancy: 'single', rateEGP: 50000, enabled: true },
          { occupancy: 'triple', rateEGP: 80000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'Immerse yourself in four days of royal pharaonic splendor residing at the historic Marriott Mena House at the very foot of the Great Pyramids. Enjoy private balcony views of Khufu, private Egyptologist explorations of Giza, Saqqara, and the National Museum of Egyptian Civilization, and fast-track VIP airport services.',
    policies:
      'Complimentary cancellation up to 7 days prior to arrival. Standard hotel check-in at 15:00 and check-out at 12:00 PM local Cairo time. Dedicated 24/7 concierge support.',
    included: [
      '3 Nights 5-Star Luxury Accommodation at Marriott Mena House Cairo in Pyramid View Room',
      'Daily Gourmet Buffet Breakfast at 139 Pavilion overlooking the Pyramids',
      'Private Certified Senior Egyptologist Guidance for all Monument Excursions',
      'VIP Airport Meet & Greet with Round-Trip Private Executive Transfers in Mercedes Vehicles',
      'All Giza Plateau, Saqqara Djoser Necropolis, and NMEC Royal Mummies Admissions',
    ],
    excluded: [
      'International Airline Flights',
      'Comprehensive Travel and Medical Insurance',
      'Premium Alcoholic Beverages and Minibar Items',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival & Historic Mena House Heritage Welcome',
        citySlug: 'cairo',
        description:
          'Fast-track airport meet and greet at Cairo International Airport (CAI), private luxury transfer to Marriott Mena House in Giza, evening relaxation with unobstructed views of the illuminated pyramids.',
      },
      {
        dayNumber: 2,
        title: 'Giza Plateau, Great Sphinx & Grand Egyptian Museum VIP',
        citySlug: 'cairo',
        description:
          'Morning private guided tour of the Great Pyramids and Sphinx with your senior Egyptologist, midday lunch at 139 Pavilion, and afternoon VIP exploration of the Grand Egyptian Museum.',
      },
      {
        dayNumber: 3,
        title: 'Saqqara Step Pyramid & NMEC Royal Mummies Hall',
        citySlug: 'cairo',
        description:
          'Morning expedition to the ancient necropolis of Saqqara to explore the Step Pyramid of Djoser and noble mastaba tombs, followed by an afternoon visit to the Royal Mummies Hall at NMEC.',
      },
      {
        dayNumber: 4,
        title: 'Historic Islamic Cairo, Khan El Khalili & VIP Departure',
        citySlug: 'cairo',
        description:
          'Guided morning stroll along historic Al-Muizz Street and Khan El Khalili artisan bazaar, hotel check-out at 12:00 PM, and private executive transfer to Cairo International Airport.',
      },
    ],
    seo: {
      title: "Cairo Royal Antiquities Immersion 4 Days | L'Aube Voyage",
      description:
        'Experience Cairo in 4 days with luxury stay at Marriott Mena House, private Egyptologist, and VIP access to Giza Pyramids and GEM.',
      keywords: 'Cairo 4 days luxury, Mena House Pyramids stay, Grand Egyptian Museum private, Egypt luxury vacation',
    },
  },

  // 3. EXP-EG-03: Classical Egypt & Nile Sovereign Journey (8D/7N)
  {
    title: 'Classical Egypt & Nile Sovereign Journey',
    slug: 'classical-egypt-and-nile-8d',
    heroAssetKey: 'exp-hero-classical-nile-odyssey',
    galleryAssetKeys: ['exp-gallery-karnak-colonnade-luxor', 'exp-gallery-aswan-nile-islands'],
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'cairo',
    destinationSlugs: ['luxor', 'aswan'],
    price: 100000,
    availability: 'available',
    duration: {
      days: 8,
      nights: 7,
    },
    childPolicy: {
      childrenAllowed: true,
      childSharingBedPercentage: 50,
      childExtraBedPercentage: 75,
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'four-seasons-hotel-cairo-at-nile-plaza',
        nights: 3,
        roomCategory: 'Deluxe Nile-View Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 54000, enabled: true },
          { occupancy: 'single', rateEGP: 45000, enabled: true },
          { occupancy: 'triple', rateEGP: 72000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'sofitel-winter-palace-luxor',
        nights: 2,
        roomCategory: 'Luxury Room, Garden View (Palace Wing)',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 26000, enabled: true },
          { occupancy: 'single', rateEGP: 21000, enabled: true },
          { occupancy: 'triple', rateEGP: 35000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 3,
        propertySlug: 'sofitel-legend-old-cataract-aswan',
        nights: 2,
        roomCategory: 'Palace Luxury Room, Nile View',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 40000, enabled: true },
          { occupancy: 'single', rateEGP: 32000, enabled: true },
          { occupancy: 'triple', rateEGP: 54000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'The definitive 8-day private sovereign journey traversing Cairo, Luxor, and Aswan with residence in Egypt’s three most legendary palace landmarks: Four Seasons Hotel Cairo at Nile Plaza, Sofitel Winter Palace Luxor, and Sofitel Legend Old Cataract Aswan.',
    policies:
      'Complimentary cancellation up to 14 days prior to departure. Domestic flight baggage allowance included according to EgyptAir premium business/first tier standards.',
    included: [
      '7 Nights in 5-Star Heritage Palace Hotels (Four Seasons Cairo, Winter Palace Luxor, Old Cataract Aswan)',
      'Daily Gourmet Buffet Breakfast at all Palace Properties',
      'Domestic Airline Flights (Cairo to Luxor and Aswan to Cairo)',
      'Private Certified Senior Egyptologist Guidance throughout the entire Journey',
      'Private Executive Ground Transfers and Private Nile Felucca Charters',
      'All Sightseeing and Monument VIP Admission Fees (Valley of the Kings Tutankhamun Tomb, Karnak, Philae)',
    ],
    excluded: [
      'International Flights to/from Egypt',
      'Optional Hot Air Balloon Excursion in Luxor',
      'Optional Private Excursion to Abu Simbel',
      'Discretionary Gratuities and Personal Shopping',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Arrival in Cairo & Garden City Nile Elegance',
        citySlug: 'cairo',
        description:
          'VIP arrival at Cairo International Airport, fast-track meet and greet, private transfer to Four Seasons Hotel Cairo at Nile Plaza, evening relaxation with sweeping riverfront views.',
      },
      {
        dayNumber: 2,
        title: 'Giza Plateau, Great Sphinx & Grand Egyptian Museum',
        citySlug: 'cairo',
        description:
          'Full-day private Egyptologist exploration of the Giza Pyramids, Sphinx, and the monumental treasures of the Grand Egyptian Museum with lunch overlooking the monuments.',
      },
      {
        dayNumber: 3,
        title: 'Saqqara Djoser Complex, NMEC Royal Mummies & Historic Cairo',
        citySlug: 'cairo',
        description:
          'Morning private expedition to Saqqara Step Pyramid and Noble Mastabas, afternoon visit to the Royal Mummies at NMEC, and sunset felucca sail along the Nile.',
      },
      {
        dayNumber: 4,
        title: 'Flight to Luxor & Historic Winter Palace Residence',
        citySlug: 'luxor',
        description:
          'Morning domestic flight to Luxor, check-in to Sofitel Winter Palace Luxor, afternoon private tour of Karnak Temple complex and illuminated Luxor Temple.',
      },
      {
        dayNumber: 5,
        title: 'Valley of the Kings & Hatshepsut Terraced Temple',
        citySlug: 'luxor',
        description:
          'Private expedition to the West Bank royal necropolis including King Tutankhamun tomb access, Queen Hatshepsut Temple, and Colossi of Memnon.',
      },
      {
        dayNumber: 6,
        title: 'Scenic Nile Valley to Aswan via Edfu & Old Cataract Legend',
        citySlug: 'aswan',
        description:
          'Private scenic transfer to Aswan with private visit to Temple of Horus in Edfu, check-in to Sofitel Legend Old Cataract Aswan, sunset drinks on the Churchill Terrace.',
      },
      {
        dayNumber: 7,
        title: 'Island Temple of Philae & Elephantine Felucca Cruise',
        citySlug: 'aswan',
        description:
          'Private boat to the sacred Island Temple of Isis at Philae, visit to Aswan High Dam, and afternoon felucca sail around Elephantine Island and Kitchener’s Botanical Island.',
      },
      {
        dayNumber: 8,
        title: 'Old Cataract Terrace Breakfast & VIP Flight to Cairo Departure',
        citySlug: 'aswan',
        description:
          'Morning champagne breakfast on the historic Churchill terrace, private transfer to Aswan Airport for flight to Cairo connecting to international departures.',
      },
    ],
    seo: {
      title: "Classical Egypt & Nile 8 Days Private Palace Tour | L'Aube Voyage",
      description:
        'Discover Egypt in 8 days with luxury palace hotel stays at Four Seasons Cairo, Winter Palace Luxor, and Old Cataract Aswan.',
      keywords: 'Egypt 8 days luxury, Cairo Luxor Aswan tour, Winter Palace Luxor, Old Cataract Aswan, luxury Nile trip',
    },
  },

  // 4. EXP-EG-04: Grand Egypt Imperial Journey: Cairo, Luxor & Aswan Loop (10D/9N)
  {
    title: 'Grand Egypt Imperial Journey: Cairo, Luxor & Aswan Loop',
    slug: 'grand-egypt-imperial-loop-10d',
    heroAssetKey: 'exp-hero-old-cataract-aswan',
    galleryAssetKeys: ['exp-gallery-abu-simbel-temple', 'exp-gallery-luxor-temple-night'],
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'cairo',
    destinationSlugs: ['luxor', 'aswan'],
    price: 120000,
    availability: 'available',
    duration: {
      days: 10,
      nights: 9,
    },
    childPolicy: {
      childrenAllowed: true,
      childSharingBedPercentage: 50,
      childExtraBedPercentage: 75,
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'the-nile-ritz-carlton-cairo',
        nights: 3,
        roomCategory: 'Deluxe Nile View Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 51000, enabled: true },
          { occupancy: 'single', rateEGP: 42000, enabled: true },
          { occupancy: 'triple', rateEGP: 68000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'hilton-luxor-resort-and-spa',
        nights: 2,
        roomCategory: 'King Nile View Suite',
        boardBasis: 'half_board',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 32000, enabled: true },
          { occupancy: 'single', rateEGP: 26000, enabled: true },
          { occupancy: 'triple', rateEGP: 44000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 3,
        propertySlug: 'sofitel-legend-old-cataract-aswan',
        nights: 2,
        roomCategory: 'Palace Prestige Suite, Nile View',
        boardBasis: 'half_board',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 48000, enabled: true },
          { occupancy: 'single', rateEGP: 38000, enabled: true },
          { occupancy: 'triple', rateEGP: 65000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 4,
        propertySlug: 'marriott-mena-house-cairo',
        nights: 2,
        roomCategory: 'Deluxe Room, Pyramid View, Balcony',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 34000, enabled: true },
          { occupancy: 'single', rateEGP: 28000, enabled: true },
          { occupancy: 'triple', rateEGP: 46000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'A monumental 10-day imperial circuit spanning Cairo, Luxor, and Aswan before culminating at the very foot of the Great Pyramids of Giza with residence at Marriott Mena House.',
    policies:
      'Complimentary cancellation up to 14 days prior to departure. Full domestic flight arrangements, luggage logistics, and VIP airport lounge access included.',
    included: [
      '9 Nights in Egypt’s Most Renowned 5-Star Luxury Palaces and Resorts',
      'Daily Gourmet Breakfast and Selected Gourmet Dinners in Upper Egypt',
      'All Domestic Flights (Cairo to Luxor, Aswan to Cairo)',
      'Dedicated Senior Certified Egyptologist Guide throughout the entire Tour',
      'Private Mercedes-Benz Executive Ground Transfers throughout',
      'All Temple and Archaeological Site VIP Admissions including Tutankhamun',
    ],
    excluded: [
      'International Airfare to/from Cairo',
      'Personal Spa Treatments and Discretionary Purchases',
      'Gratuities for Guides and Drivers',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Cairo & The Nile Ritz-Carlton',
        citySlug: 'cairo',
        description: 'VIP meet at Cairo Airport, private transfer to The Nile Ritz-Carlton overlooking Tahrir Square and the Nile.',
      },
      {
        dayNumber: 2,
        title: 'Egyptian Museum & Historic Islamic Citadels',
        citySlug: 'cairo',
        description: 'Private tour of the Egyptian Antiquities Museum, Citadel of Saladin, and Mosque of Muhammad Ali.',
      },
      {
        dayNumber: 3,
        title: 'Saqqara, Memphis & Old Coptic Cairo',
        citySlug: 'cairo',
        description: 'Excursion to Djoser Step Pyramid at Saqqara and the historic churches of Old Cairo.',
      },
      {
        dayNumber: 4,
        title: 'Flight to Luxor & Karnak Temple Complex',
        citySlug: 'luxor',
        description: 'Flight to Luxor, check-in to Hilton Luxor Resort & Spa, afternoon private exploration of Karnak Temple.',
      },
      {
        dayNumber: 5,
        title: 'Valley of the Kings, Hatshepsut & Luxor Sunset',
        citySlug: 'luxor',
        description: 'Full-day West Bank expedition exploring royal tombs and the Colossi of Memnon.',
      },
      {
        dayNumber: 6,
        title: 'Scenic Transfer to Aswan via Kom Ombo',
        citySlug: 'aswan',
        description: 'Private transfer along the Nile Valley with stop at the twin temple of Kom Ombo, check-in to Sofitel Legend Old Cataract.',
      },
      {
        dayNumber: 7,
        title: 'Philae Temple & Private Felucca Sail',
        citySlug: 'aswan',
        description: 'Private boat to Island Temple of Philae, Aswan High Dam, and sunset felucca navigation.',
      },
      {
        dayNumber: 8,
        title: 'Flight to Cairo & Marriott Mena House Check-in',
        citySlug: 'cairo',
        description: 'Flight back to Cairo, check-in to Marriott Mena House, private balcony views of the Great Pyramids.',
      },
      {
        dayNumber: 9,
        title: 'Giza Pyramids In-Depth & Grand Egyptian Museum',
        citySlug: 'cairo',
        description: 'Morning private guided tour of Giza Plateau and afternoon in-depth exploration of the Grand Egyptian Museum.',
      },
      {
        dayNumber: 10,
        title: 'Pyramid Sunrise Breakfast & VIP Departure',
        citySlug: 'cairo',
        description: 'Champagne breakfast overlooking the pyramids, hotel check-out at 12:00 PM, and private airport transfer.',
      },
    ],
    seo: {
      title: "Grand Egypt Imperial Journey 10 Days | L'Aube Voyage",
      description:
        'The ultimate 10-day Egypt grand tour covering Cairo, Luxor, Aswan, and Giza Pyramids with 5-star palace hotel stays.',
      keywords: 'Grand Egypt tour 10 days, luxury Egypt loop, Ritz Carlton Cairo, Old Cataract Aswan, Mena House Giza',
    },
  },

  // 5. EXP-EG-05: Cairo & Red Sea Escape: Pyramids to Sahl Hasheesh (7D/6N)
  {
    title: 'Cairo & Red Sea Escape: Pyramids to Sahl Hasheesh',
    slug: 'cairo-red-sea-escape-7d',
    heroAssetKey: 'exp-hero-red-sea-sahl-hasheesh',
    galleryAssetKeys: ['exp-gallery-hurghada-marina-resort', 'exp-gallery-red-sea-coral-waters'],
    type: 'package',
    packageMode: 'flexible_date',
    citySlug: 'cairo',
    destinationSlugs: ['hurghada'],
    price: 80000,
    availability: 'available',
    duration: {
      days: 7,
      nights: 6,
    },
    childPolicy: {
      childrenAllowed: true,
      childSharingBedPercentage: 50,
      childExtraBedPercentage: 75,
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'four-seasons-hotel-cairo-at-nile-plaza',
        nights: 3,
        roomCategory: 'Deluxe Nile-View Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 51000, enabled: true },
          { occupancy: 'single', rateEGP: 42000, enabled: true },
          { occupancy: 'triple', rateEGP: 68000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'the-oberoi-beach-resort-sahl-hasheesh',
        nights: 3,
        roomCategory: 'Deluxe Suite',
        boardBasis: 'half_board',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 54000, enabled: true },
          { occupancy: 'single', rateEGP: 44000, enabled: true },
          { occupancy: 'triple', rateEGP: 72000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'Seamlessly fuse the cultural magnitude of Cairo’s pharaonic monuments with unhurried coastal seclusion at The Oberoi Beach Resort Sahl Hasheesh along the Red Sea coast.',
    policies:
      'Complimentary cancellation up to 7 days prior to arrival. Includes domestic flight from Cairo to Hurghada with full luggage allowance.',
    included: [
      '3 Nights at Four Seasons Hotel Cairo at Nile Plaza (Bed & Breakfast)',
      '3 Nights at The Oberoi Beach Resort Sahl Hasheesh in Deluxe Suite (Half Board)',
      'Domestic Flight Tickets from Cairo to Hurghada',
      'Private Giza Pyramids and Grand Egyptian Museum Guided Tour with Egyptologist',
      'Private Yacht Charter to Giftun Island Marine Reserve with Guided Snorkeling',
      'All Private Airport and Inter-Property Luxury Vehicle Transfers',
    ],
    excluded: [
      'International Flight Tickets',
      'Scuba Diving Certification Courses',
      'Personal Spa Treatments and Souvenirs',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Cairo & Nile Plaza Luxury',
        citySlug: 'cairo',
        description: 'Private airport transfer to Four Seasons Nile Plaza and evening Nile relaxation.',
      },
      {
        dayNumber: 2,
        title: 'Giza Pyramids & Grand Egyptian Museum VIP',
        citySlug: 'cairo',
        description: 'Private tour of the Giza Plateau, Sphinx, and GEM galleries with certified Egyptologist.',
      },
      {
        dayNumber: 3,
        title: 'Saqqara Step Pyramid & Historic Old Cairo',
        citySlug: 'cairo',
        description: 'Morning exploration of Saqqara Necropolis and afternoon walk through historic Islamic Cairo.',
      },
      {
        dayNumber: 4,
        title: 'Flight to Hurghada & The Oberoi Sahl Hasheesh Suite Check-in',
        citySlug: 'hurghada',
        description: 'Flight to Hurghada, private transfer to The Oberoi Sahl Hasheesh, afternoon beach leisure.',
      },
      {
        dayNumber: 5,
        title: 'Private Yacht Charter to Giftun Marine Reserve',
        citySlug: 'hurghada',
        description: 'Private day cruise to Orange Bay and protected coral reefs with guided snorkeling and seafood lunch.',
      },
      {
        dayNumber: 6,
        title: 'Red Sea Coastal Leisure & Sunset Desert Safari',
        citySlug: 'hurghada',
        description: 'Morning spa and private beach relaxation, afternoon luxury quad safari into the Eastern Desert.',
      },
      {
        dayNumber: 7,
        title: 'Morning Beach Leisure & VIP Airport Departure',
        citySlug: 'hurghada',
        description: 'Breakfast by the sea, hotel check-out at 12:00 PM, and private transfer to Hurghada Airport (HRG).',
      },
    ],
    seo: {
      title: "Cairo & Red Sea Escape 7 Days | L'Aube Voyage",
      description:
        'Combine Cairo Pyramids with 5-star beachfront luxury at The Oberoi Sahl Hasheesh on the Red Sea across 7 days.',
      keywords: 'Cairo Hurghada package, Oberoi Sahl Hasheesh, Red Sea luxury vacation, Egypt pyramids and beach 7 days',
    },
  },

  // 6. EXP-EG-06: Alexandria Mediterranean Escape Private Experience (Daily Tour)
  {
    title: 'Alexandria Mediterranean Escape Private Experience',
    slug: 'alexandria-mediterranean-pearl-day-tour',
    heroAssetKey: 'exp-hero-alexandria-qaitbay',
    galleryAssetKeys: ['exp-gallery-bibliotheca-alexandrina', 'exp-gallery-montaza-palace-gardens'],
    type: 'daily_tour',
    citySlug: 'cairo',
    destinationSlugs: ['alexandria'],
    price: 9500,
    availability: 'available',
    duration: {
      durationMinutes: 600, // 10 Hours (1 Day)
    },
    description:
      'An exclusive full-day chauffeur-driven private expedition from Cairo to Alexandria, the legendary Mediterranean metropolis founded by Alexander the Great.',
    policies:
      'Full refund for cancellations made at least 24 hours prior to tour departure time. Instant booking confirmation.',
    included: [
      'Private Luxury Chauffeur Transport from Cairo to Alexandria Round-Trip in Mercedes V-Class',
      'Private Professional Egyptologist & Historian Guide in Alexandria',
      'All Monument Admissions: Bibliotheca Alexandrina, Citadel of Qaitbay, Kom El Shoqafa Catacombs',
      'Gourmet Mediterranean Seafood Lunch at Premier Waterfront Restaurant',
      'Chilled Artisan Refreshments and High-Speed Wi-Fi Onboard',
    ],
    excluded: [
      'Discretionary Tipping and Gratuities',
      'Personal Souvenir Purchases',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Catacombs of Kom El Shoqafa, Citadel of Qaitbay & Bibliotheca Alexandrina',
        citySlug: 'alexandria',
        description:
          'Private morning pickup in Cairo, scenic drive to Alexandria, private tour of Catacombs of Kom El Shoqafa, Pompey’s Pillar, Citadel of Qaitbay overlooking the ancient Pharos Lighthouse site, seafood lunch, and guided visit to the Bibliotheca Alexandrina.',
      },
    ],
    seo: {
      title: "Alexandria Private Day Tour from Cairo | L'Aube Voyage",
      description:
        'Book a private luxury day tour from Cairo to Alexandria with private chauffeur, Bibliotheca Alexandrina tour, and seafood lunch.',
      keywords: 'Alexandria day tour, Cairo to Alexandria private guide, Bibliotheca Alexandrina VIP, Citadel of Qaitbay',
    },
  },

  // =========================================================================
  // GROUP 2: LUXURY NILE CRUISERS (2 Experiences)
  // =========================================================================

  // 7. EXP-NL-01: The Oberoi Zahra Sovereign Nile Journey (5D/4N)
  {
    title: 'The Oberoi Zahra Sovereign Nile Journey',
    slug: 'the-oberoi-zahra-luxury-nile-cruise-5d',
    heroAssetKey: 'exp-hero-oberoi-zahra-nile',
    galleryAssetKeys: ['exp-gallery-luxury-cruise-sundeck', 'exp-gallery-kom-ombo-temple'],
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'luxor',
    destinationSlugs: ['aswan'],
    price: 100000,
    availability: 'available',
    duration: {
      days: 5,
      nights: 4,
    },
    childPolicy: {
      childrenAllowed: false, // L'Aube Commercial Policy: dedicated to adult guests (12+)
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'the-oberoi-zahra-luxury-nile-cruiser',
        nights: 4,
        roomCategory: 'Luxury Cabin',
        boardBasis: 'full_board',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 110000, enabled: true },
          { occupancy: 'single', rateEGP: 95000, enabled: true },
          { occupancy: 'triple', rateEGP: 145000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'Sail the eternal Nile in peerless boutique luxury onboard The Oberoi Zahra. With only 27 full-sized cabins, a dedicated wellness spa, gourmet à la carte dining, and private Egyptologist shore expeditions from Luxor to Aswan.',
    policies:
      'Hotel Policy: Guests under 7 years of age are prohibited onboard by vessel maritime safety regulations. L\'Aube Commercial Policy: L\'Aube Voyage reserves this boutique luxury cruise exclusively for adult guests and young adults aged 12 and above. Complimentary cancellation up to 30 days prior to embarkation date.',
    included: [
      '4 Nights Onboard The Oberoi Zahra in a Panoramic Luxury Cabin',
      'All Gourmet À La Carte Meals (Breakfast, Lunch, Afternoon High Tea, Multi-Course Dinner)',
      'Dedicated Private Certified Egyptologist for all Shore Excursions',
      'All Temple Entrance Fees: Karnak, Luxor, Valley of the Kings, Edfu, Kom Ombo, Philae',
      'Private Airport and Port Transfers in Luxor and Aswan in Luxury Vehicles',
    ],
    excluded: [
      'Domestic or International Airline Flights',
      'Premium Wine, Champagne, and Selected Spirits',
      'Onboard Spa Treatments and Massages',
      'Optional Hot Air Balloon Excursion in Luxor',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Embarkation in Luxor & Karnak Temple',
        citySlug: 'luxor',
        description:
          'Embark on The Oberoi Zahra at midday, welcome lunch onboard, afternoon private tour of Karnak Temple and illuminated Luxor Temple.',
      },
      {
        dayNumber: 2,
        title: 'Valley of the Kings & Sailing to Esna',
        citySlug: 'luxor',
        description:
          'Morning expedition to the Valley of the Kings, Hatshepsut Temple, and Colossi of Memnon. Midday sailing toward Esna with afternoon tea on the sun deck.',
      },
      {
        dayNumber: 3,
        title: 'Temple of Horus at Edfu & Kom Ombo Sunset',
        citySlug: 'aswan',
        description:
          'Morning private visit to Temple of Horus in Edfu, scenic daytime navigation past ancient Nile villages, sunset tour of Kom Ombo Temple.',
      },
      {
        dayNumber: 4,
        title: 'Philae Temple & High Dam in Aswan',
        citySlug: 'aswan',
        description:
          'Morning exploration of the relocated Island Temple of Philae and Aswan High Dam. Afternoon private felucca cruise around Elephantine Island. Egyptian gala dinner.',
      },
      {
        dayNumber: 5,
        title: 'Disembarkation in Aswan & VIP Departure',
        citySlug: 'aswan',
        description:
          'Gourmet breakfast onboard, disembarkation at 09:00 AM, and private transfer to Aswan Airport (ASW).',
      },
    ],
    seo: {
      title: "The Oberoi Zahra Luxury Nile Cruise 5 Days | L'Aube Voyage",
      description:
        'Book the ultra-luxury Oberoi Zahra 5-day Nile cruise from Luxor to Aswan with full board and private Egyptologist.',
      keywords: 'Oberoi Zahra Nile cruise, luxury Nile cruise 5 days, Luxor to Aswan cruise, best Nile cruiser Egypt',
    },
  },

  // 8. EXP-NL-02: Royal Upper Egypt Heritage: Winter Palace & Sonesta St. George (6D/5N)
  {
    title: 'Royal Upper Egypt Heritage: Winter Palace & Sonesta St. George',
    slug: 'royal-upper-egypt-heritage-winter-palace-sonesta-6d',
    heroAssetKey: 'exp-hero-winter-palace-luxor',
    galleryAssetKeys: ['exp-gallery-winter-palace-gardens', 'exp-gallery-valley-of-kings-monuments'],
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'luxor',
    destinationSlugs: ['aswan'],
    price: 85000,
    availability: 'available',
    duration: {
      days: 6,
      nights: 5,
    },
    childPolicy: {
      childrenAllowed: true,
      childSharingBedPercentage: 50,
      childExtraBedPercentage: 75,
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'sofitel-winter-palace-luxor',
        nights: 1,
        roomCategory: 'Luxury Room, Garden View (Palace Wing)',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 15000, enabled: true },
          { occupancy: 'single', rateEGP: 12000, enabled: true },
          { occupancy: 'triple', rateEGP: 21000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'sonesta-st-george-i-nile-cruise',
        nights: 3,
        roomCategory: 'Deluxe Cabin (Main/Upper Deck)',
        boardBasis: 'full_board',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 60000, enabled: true },
          { occupancy: 'single', rateEGP: 50000, enabled: true },
          { occupancy: 'triple', rateEGP: 82000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 3,
        propertySlug: 'sofitel-legend-old-cataract-aswan',
        nights: 1,
        roomCategory: 'Palace Luxury Room, Nile View',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 25000, enabled: true },
          { occupancy: 'single', rateEGP: 20000, enabled: true },
          { occupancy: 'triple', rateEGP: 34000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'A majestic 6-day heritage voyage uniting pre-cruise grandeur at Sofitel Winter Palace Luxor, 3 nights sailing the Nile on Sonesta St. George I, and a grand finale stay at Sofitel Legend Old Cataract Aswan.',
    policies:
      'Complimentary cancellation up to 21 days prior to embarkation date. Includes all scheduled shore excursions with dedicated Egyptologist.',
    included: [
      '1 Night at Sofitel Winter Palace Luxor (Bed & Breakfast)',
      '3 Nights Onboard Sonesta St. George I Nile Cruiser (Full Board)',
      '1 Night at Sofitel Legend Old Cataract Aswan (Bed & Breakfast)',
      'Private Certified Egyptologist Guidance for all Monument Excursions',
      'All Temple Entrance Fees in Luxor, Edfu, Kom Ombo, and Aswan',
      'All Private Airport and Port Transfers in Luxor and Aswan',
    ],
    excluded: [
      'Domestic and International Airfare',
      'Alcoholic Beverages and Minibar Items',
      'Optional Abu Simbel Excursion',
      'Discretionary Tipping',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Luxor & Historic Winter Palace',
        citySlug: 'luxor',
        description: 'Arrival in Luxor, check-in to Sofitel Winter Palace Luxor, evening stroll through royal gardens and Luxor Temple.',
      },
      {
        dayNumber: 2,
        title: 'Valley of the Kings & Embarkation on Sonesta St. George',
        citySlug: 'luxor',
        description: 'Morning tour of Valley of the Kings and Hatshepsut Temple, embarkation on Sonesta St. George I, afternoon sailing toward Esna.',
      },
      {
        dayNumber: 3,
        title: 'Temple of Horus at Edfu & Kom Ombo Navigation',
        citySlug: 'aswan',
        description: 'Visit to Edfu Temple, scenic river navigation, sunset visit to Kom Ombo Temple.',
      },
      {
        dayNumber: 4,
        title: 'Arrival in Aswan & Philae Island Temple',
        citySlug: 'aswan',
        description: 'Morning arrival in Aswan, private visit to Philae Temple and Unfinished Obelisk, overnight onboard.',
      },
      {
        dayNumber: 5,
        title: 'Disembarkation & Sofitel Legend Old Cataract Stays',
        citySlug: 'aswan',
        description: 'Disembarkation, check-in to Sofitel Legend Old Cataract Aswan, private sunset felucca ride, dinner on Churchill terrace.',
      },
      {
        dayNumber: 6,
        title: 'Old Cataract Breakfast & VIP Departure',
        citySlug: 'aswan',
        description: 'Gourmet breakfast overlooking Elephantine Island, check-out at 12:00 PM, and private transfer to Aswan Airport.',
      },
    ],
    seo: {
      title: "Royal Upper Egypt Heritage Cruise 6 Days | L'Aube Voyage",
      description:
        'Experience 6 days of royal Nile luxury combining Sofitel Winter Palace Luxor, Sonesta St. George I cruise, and Old Cataract Aswan.',
      keywords: 'Winter Palace Luxor, Sonesta St George cruise, Old Cataract Aswan, luxury Nile cruise 6 days',
    },
  },

  // =========================================================================
  // GROUP 3: INTRA-COUNTRY FLAGSHIP CIRCUITS (3 Experiences)
  // =========================================================================

  // 9. EXP-UAE-01: Emirates of Elegance: Dubai & Abu Dhabi Sovereign Odyssey (7D/6N)
  {
    title: 'Emirates of Elegance: Dubai & Abu Dhabi Sovereign Odyssey',
    slug: 'emirates-of-elegance-dubai-abu-dhabi-7d',
    heroAssetKey: 'exp-hero-emirates-of-elegance',
    galleryAssetKeys: ['exp-gallery-sheikh-zayed-mosque', 'exp-gallery-dubai-desert-twilight'],
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'dubai',
    destinationSlugs: ['abu-dhabi'],
    price: 120000,
    availability: 'available',
    duration: {
      days: 7,
      nights: 6,
    },
    childPolicy: {
      childrenAllowed: true,
      childSharingBedPercentage: 50,
      childExtraBedPercentage: 75,
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'armani-hotel-dubai',
        nights: 4,
        roomCategory: 'Armani Deluxe Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 90000, enabled: true },
          { occupancy: 'single', rateEGP: 75000, enabled: true },
          { occupancy: 'triple', rateEGP: 120000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'emirates-palace-mandarin-oriental-abu-dhabi',
        nights: 2,
        roomCategory: 'Deluxe City View Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 65000, enabled: true },
          { occupancy: 'single', rateEGP: 55000, enabled: true },
          { occupancy: 'triple', rateEGP: 88000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'An extraordinary 7-day sovereign exploration of the United Arab Emirates. Begin with 4 nights in Downtown Dubai inside the Burj Khalifa at the Armani Hotel Dubai, experiencing private yacht cruising and desert safaris, followed by 2 nights of palatial grandeur at Emirates Palace Mandarin Oriental in Abu Dhabi exploring the Louvre Abu Dhabi and Sheikh Zayed Grand Mosque.',
    policies:
      'Complimentary cancellation up to 14 days prior to departure. VIP concierge coordinating all inter-emirate chauffeur logistics, dining, and museum reservations.',
    included: [
      '4 Nights at Armani Hotel Dubai inside Burj Khalifa (Bed & Breakfast)',
      '2 Nights at Emirates Palace Mandarin Oriental, Abu Dhabi (Bed & Breakfast)',
      'Private Chauffeur Inter-Emirate Transfers in Mercedes-Benz S-Class or V-Class',
      'Private 3-Hour Luxury Yacht Charter in Dubai Marina & Palm Jumeirah',
      'VIP Fast-Track Access to Museum of the Future & At The Top Burj Khalifa SKY',
      'Private Sunset Wildlife Safari in Dubai Desert Conservation Reserve with Gourmet Starlit Dinner',
      'VIP Private Curator Tour of Louvre Abu Dhabi and Sheikh Zayed Grand Mosque',
      'All Airport and Inter-Property Luxury Vehicle Transfers',
    ],
    excluded: [
      'International Airfare to/from UAE',
      'UAE Tourist Visa Fees',
      'Personal Spa Services and Discretionary Purchases',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Dubai & Armani Hotel in Burj Khalifa',
        citySlug: 'dubai',
        description:
          'VIP fast-track meet and assist at Dubai International Airport (DXB), luxury chauffeur transfer to Armani Hotel Dubai inside the Burj Khalifa, and evening fountain views.',
      },
      {
        dayNumber: 2,
        title: 'Museum of the Future VIP & Historic Al Fahidi Heritage',
        citySlug: 'dubai',
        description:
          'Morning VIP exploration of the architectural icon Museum of the Future, followed by a private heritage tour through Al Fahidi historic district and private abra crossing.',
      },
      {
        dayNumber: 3,
        title: 'Private Palm Jumeirah Luxury Yacht & Dubai Marina',
        citySlug: 'dubai',
        description:
          'Afternoon private 3-hour yacht cruise departing Dubai Marina, sailing past Ain Dubai, Atlantis The Royal, and the iconic coastline of Palm Jumeirah with gourmet refreshments.',
      },
      {
        dayNumber: 4,
        title: 'High Fashion at Dubai Mall & Starlit Royal Desert Safari',
        citySlug: 'dubai',
        description:
          'Morning at leisure for designer fashion shopping in Fashion Avenue, followed by a private 4x4 wildlife safari in the Dubai Desert Conservation Reserve and a private starlit dune dinner.',
      },
      {
        dayNumber: 5,
        title: 'Executive Transfer to Abu Dhabi & Emirates Palace Check-in',
        citySlug: 'abu-dhabi',
        description:
          'Scenic executive chauffeur drive to Abu Dhabi, arrival and check-in to Emirates Palace Mandarin Oriental, afternoon leisure along the 1.3km private pristine beach.',
      },
      {
        dayNumber: 6,
        title: 'Sheikh Zayed Grand Mosque VIP Sunset Tour & Louvre Abu Dhabi',
        citySlug: 'abu-dhabi',
        description:
          'Curated private tour of Louvre Abu Dhabi under its floating dome, followed by a private sunset visit to the illuminated white marble Sheikh Zayed Grand Mosque and Qasr Al Watan.',
      },
      {
        dayNumber: 7,
        title: 'Palace Breakfast & VIP Airport Chauffeur Departure',
        citySlug: 'abu-dhabi',
        description:
          'Gourmet breakfast at Emirates Palace, hotel check-out at 12:00 PM, and private luxury chauffeur transfer to Abu Dhabi International Airport (AUH) or Dubai Airport (DXB).',
      },
    ],
    seo: {
      title: "Dubai & Abu Dhabi Luxury Tour 7 Days | L'Aube Voyage",
      description:
        'Experience 7 days of Arabian luxury combining Armani Hotel Dubai in Burj Khalifa with Emirates Palace Mandarin Oriental in Abu Dhabi.',
      keywords: 'Dubai Abu Dhabi luxury tour, Armani Hotel Dubai, Emirates Palace Abu Dhabi, Louvre Abu Dhabi VIP, UAE 7 day itinerary',
    },
  },

  // 10. EXP-FR-01: Paris & French Riviera: Haute Couture to Azure Coast (8D/7N)
  {
    title: 'Paris & French Riviera: Haute Couture to Azure Coast',
    slug: 'paris-french-riviera-luxury-odyssey-8d',
    heroAssetKey: 'exp-hero-paris-french-riviera',
    galleryAssetKeys: ['exp-gallery-paris-eiffel-seine', 'exp-gallery-french-riviera-coastline'],
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'paris',
    destinationSlugs: ['nice'],
    price: 180000,
    availability: 'available',
    duration: {
      days: 8,
      nights: 7,
    },
    childPolicy: {
      childrenAllowed: true,
      childSharingBedPercentage: 50,
      childExtraBedPercentage: 75,
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'the-ritz-paris',
        nights: 4,
        roomCategory: 'Superior Room, Place Vendôme',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 150000, enabled: true },
          { occupancy: 'single', rateEGP: 125000, enabled: true },
          { occupancy: 'triple', rateEGP: 200000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'hotel-palais-de-la-mediterranee-nice',
        nights: 3,
        roomCategory: 'Sea View King Room with Balcony',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 90000, enabled: true },
          { occupancy: 'single', rateEGP: 75000, enabled: true },
          { occupancy: 'triple', rateEGP: 120000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'An authentic French luxury dialogue connecting the haute couture prestige of Paris with the azure serenity of the Côte d’Azur. Reside for 4 nights at The Ritz Paris on Place Vendôme enjoying private art historian tours of the Louvre and Versailles, followed by 3 nights at Hôtel Palais de la Méditerranée along Nice’s iconic Promenade des Anglais with private yacht excursions along the French Riviera.',
    policies:
      'Complimentary cancellation up to 21 days prior to departure. VIP concierge coordinating high-speed rail/domestic air transfers, Michelin-starred restaurant bookings, and private yacht charters.',
    included: [
      '4 Nights at The Ritz Paris on Place Vendôme in Superior Room',
      '3 Nights at Hôtel Palais de la Méditerranée Nice in Sea View Balcony Room',
      'Daily Gourmet French Breakfast at both Palace Hotels',
      'First-Class TGV Inoui High-Speed Rail or Domestic Air Transfer from Paris to Nice',
      'Private Art Historian VIP Guided Tour of the Louvre Museum and Château de Versailles',
      'Private Sunset Salon Boat Cruise along the River Seine with Champagne',
      'Private Half-Day Luxury Yacht Charter along the French Riviera (Cap-Ferrat, Villefranche & Monaco)',
      'Private Chauffeur Executive Transfers in Mercedes-Benz Vehicles throughout',
    ],
    excluded: [
      'International Airfare to/from France',
      'Schengen Visa Processing Fees',
      'Discretionary Dining and Michelin-Starred Restaurant Dinners',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Paris & The Ritz Paris on Place Vendôme',
        citySlug: 'paris',
        description:
          'VIP fast-track welcome at Paris Charles de Gaulle Airport (CDG), private chauffeur transfer to The Ritz Paris on Place Vendôme, welcome champagne reception.',
      },
      {
        dayNumber: 2,
        title: 'Louvre Museum Private Art Historian Tour & Palais-Royal',
        citySlug: 'paris',
        description:
          'Exclusive private art historian guided tour through the masterpieces of the Louvre Museum, followed by a curated stroll through the gardens of Palais-Royal.',
      },
      {
        dayNumber: 3,
        title: 'Château de Versailles Royal Apartments & Private Seine Sunset Cruise',
        citySlug: 'paris',
        description:
          'Private morning excursion to the Hall of Mirrors and Royal State Apartments at Versailles, followed by an evening private salon boat cruise along the Seine.',
      },
      {
        dayNumber: 4,
        title: 'Haute Couture Promenade on Rue Saint-Honoré & Musée d’Orsay',
        citySlug: 'paris',
        description:
          'Personal shopping concierge promenade along Rue du Faubourg Saint-Honoré, afternoon private tour of Impressionist treasures at Musée d’Orsay.',
      },
      {
        dayNumber: 5,
        title: 'First-Class Scenic Rail to Nice & Promenade des Anglais Check-in',
        citySlug: 'nice',
        description:
          'First-class high-speed TGV journey through Provence to Nice, private transfer to Hôtel Palais de la Méditerranée on the Promenade des Anglais, Mediterranean sunset.',
      },
      {
        dayNumber: 6,
        title: 'Private French Riviera Yacht Charter (Cap-Ferrat & Bay of Monaco)',
        citySlug: 'nice',
        description:
          'Private half-day yacht charter departing Nice harbor, cruising past the billionaire peninsula of Saint-Jean-Cap-Ferrat, Villefranche Bay, and the coastline of Monaco.',
      },
      {
        dayNumber: 7,
        title: 'Vieux Nice Belle Époque Walk & Medieval Hilltop Village of Èze',
        citySlug: 'nice',
        description:
          'Morning stroll through Cours Saleya flower market and Old Town Nice, afternoon private excursion to the dramatic medieval eagle’s nest village of Èze.',
      },
      {
        dayNumber: 8,
        title: 'Mediterranean Balcony Breakfast & VIP Airport Departure',
        citySlug: 'nice',
        description:
          'Gourmet breakfast overlooking the Baie des Anges, hotel check-out at 12:00 PM, and private chauffeur transfer to Nice Côte d’Azur International Airport (NCE).',
      },
    ],
    seo: {
      title: "Paris & French Riviera Luxury Tour 8 Days | L'Aube Voyage",
      description:
        'Experience 8 days connecting Parisian haute hôtellerie at The Ritz Paris with Riviera glamour at Palais de la Méditerranée in Nice.',
      keywords: 'Paris French Riviera luxury tour, The Ritz Paris Place Vendome, Palais de la Mediterranee Nice, luxury France vacation 8 days',
    },
  },

  // 11. EXP-IT-01: Italian Grand Cities: Rome, Florence & Venice Classic Odyssey (8D/7N)
  {
    title: 'Italian Grand Cities: Rome, Florence & Venice Classic Odyssey',
    slug: 'italian-grand-cities-rome-florence-venice-8d',
    heroAssetKey: 'exp-hero-italian-grand-cities',
    galleryAssetKeys: ['exp-gallery-florence-duomo-view', 'exp-gallery-venice-grand-canal'],
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'rome',
    destinationSlugs: ['florence', 'venice'],
    price: 170000,
    availability: 'available',
    duration: {
      days: 8,
      nights: 7,
    },
    childPolicy: {
      childrenAllowed: true,
      childSharingBedPercentage: 50,
      childExtraBedPercentage: 75,
    },
    accommodations: [
      {
        order: 1,
        propertySlug: 'hotel-de-russie-rome',
        nights: 3,
        roomCategory: 'Classic Deluxe Room, Secret Garden View',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 90000, enabled: true },
          { occupancy: 'single', rateEGP: 75000, enabled: true },
          { occupancy: 'triple', rateEGP: 120000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'the-st-regis-florence',
        nights: 2,
        roomCategory: 'Deluxe Arno River View Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 65000, enabled: true },
          { occupancy: 'single', rateEGP: 54000, enabled: true },
          { occupancy: 'triple', rateEGP: 86000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 3,
        propertySlug: 'hotel-danieli-venice',
        nights: 2,
        roomCategory: 'Premium Venetian Room with Lagoon View',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 70000, enabled: true },
          { occupancy: 'single', rateEGP: 58000, enabled: true },
          { occupancy: 'triple', rateEGP: 92000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'The quintessential Italian grand tour traversing Rome, Florence, and Venice in supreme luxury. Reside at Hotel de Russie in Rome with private after-hours Vatican access, The St. Regis Florence with private Uffizi Gallery viewings, and Hotel Danieli in Venice with private mahogany water taxis and sunset lagoon voyages.',
    policies:
      'Complimentary cancellation up to 21 days prior to departure. VIP concierge coordinating all executive high-speed rail tickets, museum clearances, and private water transfers.',
    included: [
      '3 Nights at Hotel de Russie, Rome in Secret Garden View Deluxe Room',
      '2 Nights at The St. Regis Florence in Deluxe Arno River View Room',
      '2 Nights at Hotel Danieli, Venice in Premium Lagoon View Room',
      'Daily Gourmet Italian Breakfast at all three 5-Star Palace Properties',
      'Executive Club Class High-Speed Train Tickets (Rome to Florence, Florence to Venice)',
      'Private Before-Hours VIP Access to the Vatican Museums, Sistine Chapel, and St. Peter’s Basilica',
      'Private Colosseum Gladiators’ Arena Floor and Roman Forum Archaeological Tour',
      'Private Art Historian VIP Guided Tour of the Uffizi Gallery & Michelangelo’s David at the Accademia',
      'Private Mahogany Water Taxi Transfers in Venice and Sunset Grand Canal Gondola Voyage',
      'All Private Chauffeur Transfers in Mercedes-Benz Executive Vehicles throughout',
    ],
    excluded: [
      'International Airfare to Rome / from Venice',
      'Schengen Visa Processing Fees',
      'Discretionary Gastronomic Dinners and Wine Purchases',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Rome & Hotel de Russie Secret Garden',
        citySlug: 'rome',
        description:
          'VIP meet and assist at Rome Fiumicino Airport (FCO), private Mercedes chauffeur transfer to Hotel de Russie near Piazza del Popolo, welcome aperitivo in the terraced Secret Garden.',
      },
      {
        dayNumber: 2,
        title: 'Vatican Museums & Sistine Chapel Before-Hours VIP Tour',
        citySlug: 'rome',
        description:
          'Exclusive early morning before-hours access to the Vatican Museums and Sistine Chapel with private art historian, followed by a private tour of St. Peter’s Basilica.',
      },
      {
        dayNumber: 3,
        title: 'Colosseum Arena Floor, Roman Forum & Trevi Fountain Twilight',
        citySlug: 'rome',
        description:
          'Private archaeological tour of the Colosseum Gladiators’ arena floor and Roman Forum, afternoon leisure, evening walking tour past the illuminated Pantheon and Trevi Fountain.',
      },
      {
        dayNumber: 4,
        title: 'Executive Train to Florence, The St. Regis & Uffizi Renaissance Masterpieces',
        citySlug: 'florence',
        description:
          'First-class high-speed Frecciarossa train to Florence, check-in to The St. Regis Florence along the Arno River, afternoon private VIP tour of Botticelli and Da Vinci treasures at the Uffizi Gallery.',
      },
      {
        dayNumber: 5,
        title: 'Accademia David VIP Tour, Ponte Vecchio & Chianti Wine Excursion',
        citySlug: 'florence',
        description:
          'Morning private viewing of Michelangelo’s David at the Accademia, stroll across the historic Ponte Vecchio, afternoon private wine estate excursion in the rolling Chianti hills.',
      },
      {
        dayNumber: 6,
        title: 'High-Speed Train to Venice, Private Water Taxi to Hotel Danieli & Gondola Serenade',
        citySlug: 'venice',
        description:
          'Executive train to Venice Santa Lucia, private mahogany Riva water taxi transfer along the Grand Canal to Hotel Danieli, sunset private gondola voyage through secret canals.',
      },
      {
        dayNumber: 7,
        title: 'Private St. Mark’s & Doge’s Palace After-Hours & Murano Artisan Studio',
        citySlug: 'venice',
        description:
          'Private morning boat to Murano for master glassblowing demonstration, evening after-hours private tour of St. Mark’s Basilica and Doge’s Palace, farewell gourmet dinner overlooking the lagoon.',
      },
      {
        dayNumber: 8,
        title: 'Venetian Lagoon Breakfast & VIP Private Water Taxi Airport Departure',
        citySlug: 'venice',
        description:
          'Gourmet breakfast on the rooftop terrace overlooking the lagoon, hotel check-out at 12:00 PM, and private luxury water taxi transfer directly to Venice Marco Polo Airport (VCE).',
      },
    ],
    seo: {
      title: "Rome, Florence & Venice Luxury Tour 8 Days | L'Aube Voyage",
      description:
        'Experience 8 days of classical Italian luxury combining Hotel de Russie Rome, The St. Regis Florence, and Hotel Danieli Venice.',
      keywords: 'Rome Florence Venice luxury tour, Hotel de Russie Rome, St Regis Florence, Hotel Danieli Venice, Italy luxury vacation 8 days',
    },
  },
]

export interface SeededExperiencesResult {
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
  dailyToursCount: number
  packagesCount: number
  accommodationsLinkedCount: number
  destinationsLinkedCount: number
  heroLinkedCount: number
  galleryImagesLinkedCount: number
  departureSlotsCreated: number
  experienceDocsMap: Record<string, any>
}

/**
 * Enterprise Experience Seeder for L'Aube Voyage.
 * Ingests 11 normalized canonical experiences with deterministic idempotency.
 * Resolves and attaches verified Media documents to Experience.hero and Experience.gallery.
 * STRICT ZERO departure slots, bookings, or capacity inventory created.
 */
export async function seedCatalogExperiences(
  payload: Payload,
  cityDocsMap?: Record<string, any>,
  accommodationDocsMap?: Record<string, any>,
  experienceMediaAssetMap?: Record<string, number>,
): Promise<SeededExperiencesResult> {
  console.log("🌴 [Seed] Ingesting & Resolving Curated Experiences (11 Normalized Canonical Journeys)...")

  // Resolve City documents map if not provided
  let citiesMap = cityDocsMap
  if (!citiesMap || Object.keys(citiesMap).length === 0) {
    const citiesRes = await payload.find({ collection: 'cities', limit: 100 })
    citiesMap = {}
    for (const c of citiesRes.docs) {
      citiesMap[c.slug] = c
    }
  }

  // Resolve Accommodation documents map if not provided
  let accommodationsMap = accommodationDocsMap
  if (!accommodationsMap || Object.keys(accommodationsMap).length === 0) {
    const accommodationsRes = await payload.find({ collection: 'accommodations', limit: 100 })
    accommodationsMap = {}
    for (const a of accommodationsRes.docs) {
      accommodationsMap[a.slug] = a
    }
  }

  let totalCreated = 0
  let totalUpdated = 0
  let dailyToursCount = 0
  let packagesCount = 0
  let accommodationsLinkedCount = 0
  let destinationsLinkedCount = 0
  let heroLinkedCount = 0
  let galleryImagesLinkedCount = 0
  const experienceDocsMap: Record<string, any> = {}

  for (const expDef of CANONICAL_EXPERIENCES) {
    // 1. Resolve Origin Gateway City
    const originCityDoc = citiesMap[expDef.citySlug]
    if (!originCityDoc || !originCityDoc.id) {
      throw new Error(`[ExperienceSeed] Origin City '${expDef.citySlug}' not found in citiesMap for experience '${expDef.title}'`)
    }
    const originCityId = Number(originCityDoc.id)

    // 2. Resolve Post-Origin Destinations (strictly excluding origin)
    const destinationIds: number[] = []
    if (Array.isArray(expDef.destinationSlugs) && expDef.destinationSlugs.length > 0) {
      for (const destSlug of expDef.destinationSlugs) {
        const destCityDoc = citiesMap[destSlug]
        if (!destCityDoc || !destCityDoc.id) {
          throw new Error(`[ExperienceSeed] Destination City '${destSlug}' not found in citiesMap for experience '${expDef.title}'`)
        }
        const destId = Number(destCityDoc.id)
        if (destId === originCityId) {
          throw new Error(`[ExperienceSeed] Invariant Violation: Origin City #${originCityId} cannot appear in destinations list for experience '${expDef.title}'`)
        }
        destinationIds.push(destId)
      }
    }

    // 3. Resolve Itinerary Days with City Waypoint relationships
    const resolvedItinerary = expDef.itinerary.map((day) => {
      let dayCityId: number | undefined = undefined
      if (day.citySlug) {
        const dayCityDoc = citiesMap[day.citySlug]
        if (dayCityDoc && dayCityDoc.id) {
          dayCityId = Number(dayCityDoc.id)
        }
      }
      return {
        dayNumber: day.dayNumber,
        title: day.title,
        city: dayCityId,
        description: day.description,
      }
    })

    // 4. Resolve Accommodation Stays (for packages)
    let resolvedAccommodations: any[] | undefined = undefined
    if (expDef.type === 'package' && Array.isArray(expDef.accommodations) && expDef.accommodations.length > 0) {
      resolvedAccommodations = expDef.accommodations.map((stay) => {
        const propertyDoc = accommodationsMap[stay.propertySlug]
        if (!propertyDoc || !propertyDoc.id) {
          throw new Error(`[ExperienceSeed] Property '${stay.propertySlug}' not found in accommodationsMap for experience '${expDef.title}'`)
        }
        accommodationsLinkedCount++
        return {
          order: stay.order,
          nights: stay.nights,
          options: [
            {
              property: Number(propertyDoc.id),
              isDefault: true,
              roomCategory: stay.roomCategory,
              boardBasis: stay.boardBasis,
              pricingUnit: stay.pricingUnit || 'per_stay',
              roomRates: stay.roomRates.map((r) => ({
                occupancy: r.occupancy,
                rateEGP: r.rateEGP,
                enabled: r.enabled !== false,
              })),
            },
          ],
        }
      })
    }

    // 5. Resolve Hero Media Document
    let heroMediaId: number | undefined = undefined
    if (expDef.heroAssetKey) {
      if (experienceMediaAssetMap && experienceMediaAssetMap[expDef.heroAssetKey]) {
        heroMediaId = experienceMediaAssetMap[expDef.heroAssetKey]
      } else {
        const manifestEntry = EXPERIENCE_MEDIA_MANIFEST.find((m) => m.assetKey === expDef.heroAssetKey)
        if (manifestEntry) {
          const mediaRes = await payload.find({
            collection: 'media',
            where: { filename: { equals: manifestEntry.filename } },
            limit: 1,
          })
          if (mediaRes.docs.length > 0) {
            heroMediaId = Number(mediaRes.docs[0].id)
          }
        }
      }
    }

    if (heroMediaId) {
      heroLinkedCount++
    }

    // 5b. Resolve Gallery Media Documents (at least 2 contemporary curated high-res images per experience)
    const resolvedGallery: { image: number }[] = []
    if (expDef.galleryAssetKeys && expDef.galleryAssetKeys.length > 0) {
      for (const gKey of expDef.galleryAssetKeys) {
        let gMediaId: number | undefined = undefined
        if (experienceMediaAssetMap && experienceMediaAssetMap[gKey]) {
          gMediaId = experienceMediaAssetMap[gKey]
        } else {
          const manifestEntry = EXPERIENCE_MEDIA_MANIFEST.find((m) => m.assetKey === gKey)
          if (manifestEntry) {
            const mediaRes = await payload.find({
              collection: 'media',
              where: { filename: { equals: manifestEntry.filename } },
              limit: 1,
            })
            if (mediaRes.docs.length > 0) {
              gMediaId = Number(mediaRes.docs[0].id)
            }
          }
        }
        if (gMediaId) {
          resolvedGallery.push({ image: gMediaId })
        }
      }
    }

    if (resolvedGallery.length > 0) {
      galleryImagesLinkedCount += resolvedGallery.length
    }

    // 6. Build Payload Data
    const experiencePayloadData: any = {
      title: expDef.title,
      slug: expDef.slug,
      type: expDef.type,
      city: originCityId,
      destinations: destinationIds.length > 0 ? destinationIds : undefined,
      hero: heroMediaId || undefined,
      gallery: resolvedGallery.length > 0 ? resolvedGallery : undefined,
      price: expDef.price,
      availability: expDef.availability,
      isActive: true,
      description: toLexical(expDef.description),
      policies: toLexical(expDef.policies),
      included: expDef.included.map((item) => ({ item })),
      excluded: expDef.excluded.map((item) => ({ item })),
      itinerary: resolvedItinerary,
      seo: {
        title: expDef.seo.title,
        description: expDef.seo.description,
        keywords: expDef.seo.keywords,
      },
    }

    if (expDef.type === 'package') {
      experiencePayloadData.packageMode = expDef.packageMode || 'fixed_date'
      experiencePayloadData.duration = {
        days: expDef.duration.days,
        nights: expDef.duration.nights,
      }
      if (resolvedAccommodations) {
        experiencePayloadData.accommodations = resolvedAccommodations
      }
      if (expDef.childPolicy) {
        experiencePayloadData.childPolicy = expDef.childPolicy
      }
      packagesCount++
    } else {
      experiencePayloadData.duration = {
        durationMinutes: expDef.duration.durationMinutes,
      }
      dailyToursCount++
    }

    if (destinationIds.length > 0) {
      destinationsLinkedCount += destinationIds.length
    }

    // 7. Deterministic Idempotent Upsert by unique slug
    const existing = await payload.find({
      collection: 'experiences',
      where: {
        slug: { equals: expDef.slug },
      },
      limit: 1,
    })

    let doc: any = null
    if (existing.docs.length > 0) {
      const existingId = existing.docs[0].id
      doc = await payload.update({
        collection: 'experiences',
        id: existingId,
        data: experiencePayloadData,
      })
      totalUpdated++
    } else {
      doc = await payload.create({
        collection: 'experiences',
        data: experiencePayloadData,
      })
      totalCreated++
    }

    experienceDocsMap[expDef.slug] = doc
  }

  console.log(
    `   ✅ Experiences Catalog Processed: ${Object.keys(experienceDocsMap).length}/11 journeys (${totalCreated} created, ${totalUpdated} updated, ${heroLinkedCount}/11 Hero Media linked, ${galleryImagesLinkedCount} Gallery Images linked, ${dailyToursCount} Daily Tours, ${packagesCount} Packages, ${accommodationsLinkedCount} Stays linked, STRICT ZERO departure slots).`,
  )

  return {
    totalProcessed: CANONICAL_EXPERIENCES.length,
    totalCreated,
    totalUpdated,
    dailyToursCount,
    packagesCount,
    accommodationsLinkedCount,
    destinationsLinkedCount,
    heroLinkedCount,
    galleryImagesLinkedCount,
    departureSlotsCreated: 0,
    experienceDocsMap,
  }
}
