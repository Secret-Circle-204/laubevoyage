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
 * Normalized and verified against the 16 canonical accommodation properties in catalog.
 */
export const CANONICAL_EXPERIENCES: ExperienceSeedDef[] = [
  // =========================================================================
  // GROUP 1: EGYPT CORE (6 Experiences)
  // =========================================================================

  // 1. EXP-EG-01: Giza Pyramids & Grand Egyptian Museum Private Tour
  {
    title: 'Giza Pyramids and Grand Egyptian Museum Private Tour',
    slug: 'giza-pyramids-gem-private-tour',
    heroAssetKey: 'exp-hero-giza-pyramids-gem',
    type: 'daily_tour',
    citySlug: 'cairo',
    destinationSlugs: [],
    price: 4800,
    availability: 'available',
    duration: {
      durationMinutes: 480, // 8 Hours
    },
    description:
      'Embark on an unforgettable private journey through ancient Egyptian history with our certified Egyptologist tour to the Giza Pyramids and Grand Egyptian Museum with luxury private chauffeur transport.',
    policies:
      'Full refund for cancellations requested at least 24 hours prior to scheduled tour departure. Instant booking confirmation upon checkout.',
    included: [
      'Private Certified Egyptologist Tour Guide (Fluent in Preferred Language)',
      'Luxury Executive Chauffeur Transport throughout the Day',
      'All Giza Plateau Monument and Grand Egyptian Museum VIP Admissions',
      'Gourmet 3-Course Lunch overlooking the Pyramids',
      'Chilled Mineral Water, Fresh Juices and Artisan Refreshments Onboard',
    ],
    excluded: [
      'Interior Burial Chamber Admission for the Great Pyramid of Khufu',
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
      title: "Giza Pyramids & Grand Egyptian Museum Private Tour | L'Aube Voyage",
      description:
        'Book an exclusive private luxury tour to the Giza Pyramids and GEM with certified Egyptologist guide and private executive transport.',
      keywords: 'Giza Pyramids private tour, Grand Egyptian Museum VIP, Cairo day tour, luxury Egypt guide',
    },
  },

  // 2. EXP-EG-02: Cairo Pyramids and Royal Antiquities Immersion (4D/3N)
  {
    title: 'Cairo Pyramids and Royal Antiquities Immersion',
    slug: 'cairo-pyramids-royal-antiquities-immersion',
    heroAssetKey: 'exp-hero-mena-house-pyramids',
    type: 'package',
    packageMode: 'flexible_date',
    citySlug: 'cairo',
    destinationSlugs: [],
    price: 38500,
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
          { occupancy: 'double', rateEGP: 18000, enabled: true },
          { occupancy: 'single', rateEGP: 14500, enabled: true },
          { occupancy: 'triple', rateEGP: 24800, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'Immerse yourself in four days of royal pharaonic splendor at the historic Marriott Mena House at the foot of the Great Pyramids, featuring private Egyptologist tours of Giza, Saqqara, and the National Museum of Egyptian Civilization.',
    policies:
      'Free cancellation up to 7 days prior to arrival. Standard hotel check-in at 15:00 and check-out at 12:00 PM local Cairo time.',
    included: [
      '3 Nights 5-Star Luxury Accommodation at Marriott Mena House Cairo',
      'Daily Gourmet Buffet Breakfast at 139 Pavilion overlooking the Pyramids',
      'Private Certified Egyptologist Guidance for all Monument Excursions',
      'VIP Airport Meet & Greet with Round-Trip Private Executive Transfers',
      'All Giza Plateau, Saqqara Necropolis, and NMEC Royal Mummies Admissions',
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
        title: 'Giza Plateau, Great Sphinx & Grand Egyptian Museum',
        citySlug: 'cairo',
        description:
          'Morning private guided tour of the Great Pyramids and Sphinx with your Egyptologist, midday lunch at 139 Pavilion, and afternoon VIP exploration of the Grand Egyptian Museum.',
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
          'Guided morning stroll along historic Al-Muizz Street and Khan El Khalili artisan bazaar, hotel check-out at 12:00 PM, and private transfer to Cairo International Airport.',
      },
    ],
    seo: {
      title: "Cairo Pyramids & Royal Antiquities Immersion 4 Days | L'Aube Voyage",
      description:
        'Experience Cairo in 4 days with luxury stay at Marriott Mena House, private Egyptologist, and VIP access to Giza Pyramids and GEM.',
      keywords: 'Cairo 4 days luxury, Mena House Pyramids stay, Grand Egyptian Museum private, Egypt luxury vacation',
    },
  },

  // 3. EXP-EG-03: Classical Nile and Pharaonic Odyssey (7D/6N)
  {
    title: 'Classical Nile and Pharaonic Odyssey',
    slug: 'classical-nile-pharaonic-odyssey-7d',
    heroAssetKey: 'exp-hero-classical-nile-odyssey',
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'cairo',
    destinationSlugs: ['luxor', 'aswan'],
    price: 88000,
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
        nights: 2,
        roomCategory: 'Deluxe Nile-View Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 20000, enabled: true },
          { occupancy: 'single', rateEGP: 16000, enabled: true },
          { occupancy: 'triple', rateEGP: 27500, enabled: true },
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
          { occupancy: 'double', rateEGP: 15000, enabled: true },
          { occupancy: 'single', rateEGP: 12000, enabled: true },
          { occupancy: 'triple', rateEGP: 21000, enabled: true },
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
          { occupancy: 'double', rateEGP: 22000, enabled: true },
          { occupancy: 'single', rateEGP: 18000, enabled: true },
          { occupancy: 'triple', rateEGP: 30500, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'The definitive 7-day journey connecting Cairo, Luxor, and Aswan with stays in Egypt’s most legendary heritage palace hotels: Four Seasons Nile Plaza, Sofitel Winter Palace Luxor, and Sofitel Legend Old Cataract Aswan.',
    policies:
      'Free cancellation up to 14 days prior to departure. Domestic flight baggage allowance included according to EgyptAir premium standards.',
    included: [
      '6 Nights in 5-Star Heritage Luxury Hotels across Cairo, Luxor, and Aswan',
      'Daily Gourmet Buffet Breakfast at all Hotel Properties',
      'Domestic Airline Flights (Cairo to Luxor and Aswan to Cairo)',
      'Private Certified Egyptologist Guidance throughout the Entire Journey',
      'Private Executive Ground Transfers and Nile Boat Charters',
      'All Sightseeing and Monument Admission Fees',
    ],
    excluded: [
      'International Flights to/from Egypt',
      'Optional Hot Air Balloon Excursion in Luxor',
      'Optional Abu Simbel Excursion',
      'Discretionary Gratuities and Personal Shopping',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Arrival in Cairo & Garden City Nile Elegance',
        citySlug: 'cairo',
        description:
          'VIP arrival at Cairo Airport, private transfer to Four Seasons Hotel Cairo at Nile Plaza, evening relaxation along the riverfront.',
      },
      {
        dayNumber: 2,
        title: 'Giza Plateau, Great Sphinx & Grand Egyptian Museum',
        citySlug: 'cairo',
        description:
          'Full-day private Egyptologist exploration of the Giza Pyramids, Sphinx, and the treasures of the Grand Egyptian Museum.',
      },
      {
        dayNumber: 3,
        title: 'Flight to Luxor & Historic Winter Palace Stays',
        citySlug: 'luxor',
        description:
          'Morning domestic flight to Luxor, check-in to Sofitel Winter Palace Luxor, afternoon private tour of Karnak and Luxor Temples.',
      },
      {
        dayNumber: 4,
        title: 'Valley of the Kings & Hatshepsut Temple',
        citySlug: 'luxor',
        description:
          'Expedition to the West Bank royal necropolis including King Tutankhamun tomb access, Queen Hatshepsut Temple, and Colossi of Memnon.',
      },
      {
        dayNumber: 5,
        title: 'Scenic Nile Valley to Aswan & Old Cataract Legend',
        citySlug: 'aswan',
        description:
          'Private scenic transfer to Aswan with private visit to Temple of Horus in Edfu, check-in to Sofitel Legend Old Cataract Aswan.',
      },
      {
        dayNumber: 6,
        title: 'Philae Island Temple & Nubian Culture',
        citySlug: 'aswan',
        description:
          'Private boat to the Island Temple of Isis at Philae, visit to Aswan High Dam, and afternoon felucca sail around Elephantine Island.',
      },
      {
        dayNumber: 7,
        title: 'Old Cataract Terrace & VIP Flight to Cairo Departure',
        citySlug: 'aswan',
        description:
          'Morning breakfast on the historic Churchill terrace, private transfer to Aswan Airport for flight to Cairo connecting to international departures.',
      },
    ],
    seo: {
      title: "Classical Nile & Pharaonic Odyssey 7 Days | L'Aube Voyage",
      description:
        'Discover Egypt in 7 days with luxury palace hotel stays at Four Seasons Cairo, Winter Palace Luxor, and Old Cataract Aswan.',
      keywords: 'Egypt 7 days luxury, Cairo Luxor Aswan tour, Winter Palace Luxor, Old Cataract Aswan, luxury Nile trip',
    },
  },

  // 4. EXP-EG-04: Grand Egypt Imperial Heritage Loop (10D/9N)
  {
    title: 'Grand Egypt Imperial Heritage Loop',
    slug: 'grand-egypt-imperial-loop-10d',
    heroAssetKey: 'exp-hero-old-cataract-aswan',
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'cairo',
    destinationSlugs: ['luxor', 'aswan'],
    price: 135000,
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
          { occupancy: 'double', rateEGP: 24000, enabled: true },
          { occupancy: 'single', rateEGP: 19500, enabled: true },
          { occupancy: 'triple', rateEGP: 33000, enabled: true },
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
          { occupancy: 'double', rateEGP: 18000, enabled: true },
          { occupancy: 'single', rateEGP: 14000, enabled: true },
          { occupancy: 'triple', rateEGP: 25000, enabled: true },
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
          { occupancy: 'double', rateEGP: 28000, enabled: true },
          { occupancy: 'single', rateEGP: 22000, enabled: true },
          { occupancy: 'triple', rateEGP: 38000, enabled: true },
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
          { occupancy: 'double', rateEGP: 19000, enabled: true },
          { occupancy: 'single', rateEGP: 15500, enabled: true },
          { occupancy: 'triple', rateEGP: 26500, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'A majestic 10-day grand tour traversing Cairo, Luxor, and Aswan before returning to the foot of the Giza Pyramids for a glorious finale at Marriott Mena House.',
    policies:
      'Free cancellation up to 14 days prior to departure. Full domestic flight arrangements and baggage handling included.',
    included: [
      '9 Nights in Egypt’s Most Renowned 5-Star Luxury Palaces and Resorts',
      'Daily Gourmet Breakfast and Selected Gourmet Dinners in Upper Egypt',
      'All Domestic Flights (Cairo to Luxor, Aswan to Cairo)',
      'Dedicated Certified Egyptologist Guide throughout the entire Tour',
      'Private Air-Conditioned Luxury Ground Transfers',
      'All Temple and Archaeological Site VIP Admissions',
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
        description: 'VIP meet at Cairo Airport, private transfer to The Nile Ritz-Carlton overlooking Tahrir Square.',
      },
      {
        dayNumber: 2,
        title: 'Egyptian Museum & Historic Citadels',
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
      title: "Grand Egypt Imperial Loop 10 Days | L'Aube Voyage",
      description:
        'The ultimate 10-day Egypt grand tour covering Cairo, Luxor, Aswan, and Giza Pyramids with 5-star palace hotel stays.',
      keywords: 'Grand Egypt tour 10 days, luxury Egypt loop, Ritz Carlton Cairo, Old Cataract Aswan, Mena House Giza',
    },
  },

  // 5. EXP-EG-05: Cairo and Red Sea Coastal Haven (6D/5N)
  {
    title: 'Cairo and Red Sea Coastal Haven',
    slug: 'cairo-red-sea-marine-sanctuary-6d',
    heroAssetKey: 'exp-hero-red-sea-sahl-hasheesh',
    type: 'package',
    packageMode: 'flexible_date',
    citySlug: 'cairo',
    destinationSlugs: ['hurghada'],
    price: 74000,
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
        propertySlug: 'four-seasons-hotel-cairo-at-nile-plaza',
        nights: 2,
        roomCategory: 'Deluxe Nile-View Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 19000, enabled: true },
          { occupancy: 'single', rateEGP: 15000, enabled: true },
          { occupancy: 'triple', rateEGP: 26000, enabled: true },
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
          { occupancy: 'double', rateEGP: 24000, enabled: true },
          { occupancy: 'single', rateEGP: 19000, enabled: true },
          { occupancy: 'triple', rateEGP: 33000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'Pair Cairo’s timeless pharaonic monuments with restorative coastal luxury at The Oberoi Beach Resort Sahl Hasheesh along the Red Sea.',
    policies:
      'Free cancellation up to 7 days prior to arrival. Includes domestic flight from Cairo to Hurghada with full luggage allowance.',
    included: [
      '2 Nights at Four Seasons Hotel Cairo at Nile Plaza (Bed & Breakfast)',
      '3 Nights at The Oberoi Beach Resort Sahl Hasheesh (Half Board)',
      'Domestic Flight from Cairo to Hurghada',
      'Private Giza Pyramids and Grand Egyptian Museum Guided Tour',
      'Private Yacht Cruise to Giftun Island Marine Reserve with Snorkeling',
      'All Private Airport and Inter-Property Transfers',
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
        title: 'Giza Pyramids & Grand Egyptian Museum',
        citySlug: 'cairo',
        description: 'Private tour of the Giza Plateau, Sphinx, and GEM galleries with certified Egyptologist.',
      },
      {
        dayNumber: 3,
        title: 'Flight to Hurghada & The Oberoi Sahl Hasheesh',
        citySlug: 'hurghada',
        description: 'Flight to Hurghada, private transfer to The Oberoi Sahl Hasheesh, afternoon beach leisure.',
      },
      {
        dayNumber: 4,
        title: 'Private Yacht Charter to Giftun Marine Reserve',
        citySlug: 'hurghada',
        description: 'Private day cruise to Orange Bay and protected coral reefs with guided snorkeling and seafood lunch.',
      },
      {
        dayNumber: 5,
        title: 'Red Sea Coastal Leisure & Sunset Desert Safari',
        citySlug: 'hurghada',
        description: 'Morning spa and private beach relaxation, afternoon luxury quad safari into the Eastern Desert.',
      },
      {
        dayNumber: 6,
        title: 'Morning Swim & VIP Airport Departure',
        citySlug: 'hurghada',
        description: 'Breakfast by the sea, hotel check-out at 12:00 PM, and private transfer to Hurghada Airport (HRG).',
      },
    ],
    seo: {
      title: "Cairo & Red Sea Coastal Haven 6 Days | L'Aube Voyage",
      description:
        'Combine Cairo Pyramids with 5-star beachfront luxury at The Oberoi Sahl Hasheesh on the Red Sea.',
      keywords: 'Cairo Hurghada package, Oberoi Sahl Hasheesh, Red Sea luxury vacation, Egypt pyramids and beach',
    },
  },

  // 6. EXP-EG-06: Alexandria Mediterranean Pearl Private Tour (Daily Tour)
  {
    title: 'Alexandria Mediterranean Pearl and Greco-Roman Heritage Private Tour',
    slug: 'alexandria-mediterranean-pearl-day-tour',
    heroAssetKey: 'exp-hero-alexandria-qaitbay',
    type: 'daily_tour',
    citySlug: 'cairo',
    destinationSlugs: ['alexandria'], // Fully normalized Post-Origin Destination!
    price: 5600,
    availability: 'available',
    duration: {
      durationMinutes: 600, // 10 Hours
    },
    description:
      'A private full-day chauffeur-driven expedition from Cairo to Alexandria, the legendary Pearl of the Mediterranean founded by Alexander the Great.',
    policies:
      'Full refund for cancellations made at least 24 hours prior to tour departure time. Instant booking confirmation.',
    included: [
      'Private Luxury Chauffeur Transport from Cairo to Alexandria Round-Trip',
      'Private Professional Guide in Alexandria',
      'All Admissions: Bibliotheca Alexandrina, Citadel of Qaitbay, Kom El Shoqafa',
      'Fresh Mediterranean Seafood Lunch at Waterfront Restaurant',
      'Chilled Refreshments and Wi-Fi Onboard',
    ],
    excluded: [
      'Discretionary Tipping and Gratuities',
      'Personal Retail Purchases',
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
      title: "Alexandria Day Tour from Cairo | L'Aube Voyage",
      description:
        'Book a private luxury day tour from Cairo to Alexandria with private chauffeur, Bibliotheca Alexandrina tour, and seafood lunch.',
      keywords: 'Alexandria day tour, Cairo to Alexandria private guide, Bibliotheca Alexandrina VIP, Citadel of Qaitbay',
    },
  },

  // =========================================================================
  // GROUP 2: LUXURY NILE CRUISERS (2 Experiences)
  // =========================================================================

  // 7. EXP-NL-01: The Oberoi Zahra Upper Egypt Sovereign Cruise (5D/4N)
  {
    title: 'The Oberoi Zahra Upper Egypt Sovereign Nile Cruise',
    slug: 'the-oberoi-zahra-luxury-nile-cruise-5d',
    heroAssetKey: 'exp-hero-oberoi-zahra-nile',
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'luxor',
    destinationSlugs: ['aswan'],
    price: 115000,
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
          { occupancy: 'double', rateEGP: 46000, enabled: true },
          { occupancy: 'single', rateEGP: 38000, enabled: true },
          { occupancy: 'triple', rateEGP: 64000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'Sail the eternal Nile in unmatched boutique luxury onboard The Oberoi Zahra with only 27 cabins, full-service spa, gourmet à la carte dining, and private Egyptologist excursions from Luxor to Aswan.',
    policies:
      'Hotel Policy: Guests under 7 years of age are prohibited onboard by vessel maritime safety regulations. L\'Aube Commercial Policy: L\'Aube Voyage reserves this boutique luxury cruise exclusively for adult guests and young adults aged 12 and above. Free cancellation up to 30 days prior to embarkation date.',
    included: [
      '4 Nights Onboard The Oberoi Zahra in a Panoramic Luxury Cabin',
      'All Gourmet À La Carte Meals (Breakfast, Lunch, Afternoon Tea, Dinner)',
      'Dedicated Private Egyptologist for all Shore Excursions',
      'All Temple Entrance Fees: Karnak, Luxor, Valley of the Kings, Edfu, Kom Ombo, Philae',
      'Private Airport Transfers in Luxor and Aswan',
    ],
    excluded: [
      'Domestic or International Flights',
      'Premium Wine, Champagne, and Spirits',
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
      title: "The Oberoi Zahra Nile Cruise 5 Days | L'Aube Voyage",
      description:
        'Book the ultra-luxury Oberoi Zahra 5-day Nile cruise from Luxor to Aswan with full board and private Egyptologist.',
      keywords: 'Oberoi Zahra Nile cruise, luxury Nile cruise 5 days, Luxor to Aswan cruise, best Nile cruiser Egypt',
    },
  },

  // 8. EXP-NL-02: Royal Upper Egypt Heritage: Winter Palace & Sonesta St. George (6D/5N)
  {
    title: 'Royal Upper Egypt Heritage: Winter Palace and Sonesta St. George',
    slug: 'royal-upper-egypt-heritage-winter-palace-sonesta-6d',
    heroAssetKey: 'exp-hero-winter-palace-luxor',
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'luxor',
    destinationSlugs: ['aswan'],
    price: 92000,
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
          { occupancy: 'double', rateEGP: 30000, enabled: true },
          { occupancy: 'single', rateEGP: 24000, enabled: true },
          { occupancy: 'triple', rateEGP: 42000, enabled: true },
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
          { occupancy: 'double', rateEGP: 22000, enabled: true },
          { occupancy: 'single', rateEGP: 18000, enabled: true },
          { occupancy: 'triple', rateEGP: 30500, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'A majestic 6-day heritage journey combining pre-stay at Sofitel Winter Palace Luxor, 3 nights sailing on Sonesta St. George I, and a grand finale stay at Sofitel Legend Old Cataract Aswan.',
    policies:
      'Free cancellation up to 21 days prior to embarkation date. Includes all scheduled temple shore excursions.',
    included: [
      '1 Night at Sofitel Winter Palace Luxor (Bed & Breakfast)',
      '3 Nights Onboard Sonesta St. George I Nile Cruiser (Full Board)',
      '1 Night at Sofitel Legend Old Cataract Aswan (Bed & Breakfast)',
      'Private Egyptologist Guidance for all Monument Excursions',
      'All Temple Entrance Fees in Luxor, Edfu, Kom Ombo, and Aswan',
      'All Airport and Port Transfers in Luxor and Aswan',
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
  // GROUP 3: TRANSCONTINENTAL GRAND TOURS (3 Experiences)
  // =========================================================================

  // 9. EXP-INT-01: Pharaonic Heritage and Arabian Desert Elegance: Cairo to Dubai (7D/6N)
  {
    title: 'Pharaonic Heritage and Arabian Desert Elegance: Cairo to Dubai',
    slug: 'pharaonic-heritage-arabian-desert-elegance-cairo-dubai',
    heroAssetKey: 'exp-hero-cairo-dubai-horizon',
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'cairo',
    destinationSlugs: ['dubai'],
    price: 148000,
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
        roomCategory: 'Executive Suite Nile-View',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 28000, enabled: true },
          { occupancy: 'single', rateEGP: 22000, enabled: true },
          { occupancy: 'triple', rateEGP: 37500, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'armani-hotel-dubai',
        nights: 2,
        roomCategory: 'Armani Fountain Suite',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 35000, enabled: true },
          { occupancy: 'single', rateEGP: 28000, enabled: true },
          { occupancy: 'triple', rateEGP: 47000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 3,
        propertySlug: 'al-maha-desert-resort-and-spa-dubai',
        nights: 1,
        roomCategory: 'Bedouin Suite',
        boardBasis: 'full_board',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 42000, enabled: true },
          { occupancy: 'single', rateEGP: 24000, enabled: true },
          { occupancy: 'triple', rateEGP: 56500, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'Connect 5,000 years of pharaonic wonders in Cairo with the futuristic skyline of Downtown Dubai and the serene dunes of Al Maha Desert Resort.',
    policies:
      'Free cancellation up to 14 days prior to departure. Visa assistance provided for Egypt and UAE upon booking.',
    included: [
      '3 Nights at Four Seasons Hotel Cairo at Nile Plaza in Executive Nile Suite',
      '2 Nights at Armani Hotel Dubai in Burj Khalifa with Fountain Views',
      '1 Night at Al Maha Desert Resort in Private Bedouin Pool Villa (Full Board)',
      'Private Egyptologist Guided Tour of Giza Pyramids and Grand Egyptian Museum',
      'Private Luxury Yacht Cruise in Dubai Marina and Palm Jumeirah',
      'Sunset Wildlife Safari and Starlit Dune Dinner in Dubai Desert Reserve',
      'All Private Airport and Inter-Property Luxury Vehicle Transfers',
    ],
    excluded: [
      'Commercial Airfare between Cairo and Dubai (Concierge booking available)',
      'UAE and Egypt Tourist Visa Fees',
      'Personal Discretionary Spending and Spa Services',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Cairo & Nile Suite Check-in',
        citySlug: 'cairo',
        description: 'VIP meet at Cairo Airport, transfer to Four Seasons Nile Plaza, evening relaxation by the Nile.',
      },
      {
        dayNumber: 2,
        title: 'Giza Pyramids, The Sphinx & Grand Egyptian Museum',
        citySlug: 'cairo',
        description: 'Full-day private guided exploration of the Giza Plateau and GEM galleries with certified Egyptologist.',
      },
      {
        dayNumber: 3,
        title: 'Historic Cairo, Royal Mummies & Khan El Khalili',
        citySlug: 'cairo',
        description: 'Visit to National Museum of Egyptian Civilization Royal Mummies and the historic Al-Muizz street.',
      },
      {
        dayNumber: 4,
        title: 'Flight to Dubai & Armani Hotel in Burj Khalifa',
        citySlug: 'dubai',
        description: 'Flight to Dubai, private transfer to Armani Hotel Dubai inside Burj Khalifa, evening fountain viewing.',
      },
      {
        dayNumber: 5,
        title: 'Museum of the Future & Private Dubai Marina Yacht',
        citySlug: 'dubai',
        description: 'Morning visit to Museum of the Future and private afternoon yacht charter along Palm Jumeirah.',
      },
      {
        dayNumber: 6,
        title: 'Al Maha Desert Conservation Sanctuary',
        citySlug: 'dubai',
        description: 'Chauffeur transfer to Al Maha Desert Resort, private pool suite, falconry, and starlit Bedouin dinner.',
      },
      {
        dayNumber: 7,
        title: 'Desert Sunrise & VIP Airport Departure',
        citySlug: 'dubai',
        description: 'Sunrise breakfast overlooking the dunes, private luxury transfer to Dubai International Airport (DXB).',
      },
    ],
    seo: {
      title: "Cairo to Dubai Luxury Tour 7 Days | L'Aube Voyage",
      description:
        'Experience 7 days of luxury connecting Cairo Pyramids with Armani Hotel Dubai and Al Maha Desert Resort.',
      keywords: 'Cairo Dubai luxury package, Four Seasons Cairo, Armani Hotel Dubai, Al Maha Desert Resort',
    },
  },

  // 10. EXP-INT-02: Empires of Elegance: Cairo and Paris Palace Odyssey (8D/7N)
  {
    title: 'Empires of Elegance: Cairo and Paris Palace Odyssey',
    slug: 'empires-of-elegance-cairo-paris-palace-odyssey-8d',
    heroAssetKey: 'exp-hero-paris-place-vendome',
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'cairo',
    destinationSlugs: ['paris'],
    price: 210000,
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
        propertySlug: 'marriott-mena-house-cairo',
        nights: 3,
        roomCategory: 'Executive Suite, Pyramid View',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 32000, enabled: true },
          { occupancy: 'single', rateEGP: 21000, enabled: true },
          { occupancy: 'triple', rateEGP: 42000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'the-ritz-paris',
        nights: 4,
        roomCategory: 'Deluxe Suite (Vendôme View)',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 74000, enabled: true },
          { occupancy: 'single', rateEGP: 58000, enabled: true },
          { occupancy: 'triple', rateEGP: 98000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'A dialogue between two imperial civilizations: 3 nights in an Executive Pyramid View Suite at Marriott Mena House Cairo and 4 nights in a Deluxe Suite at The Ritz Paris on Place Vendôme.',
    policies:
      'Free cancellation up to 21 days prior to departure. VIP concierge assistance for dining reservations in Paris.',
    included: [
      '3 Nights at Marriott Mena House Cairo in Executive Pyramid View Suite',
      '4 Nights at The Ritz Paris on Place Vendôme in Deluxe Suite',
      'Daily Gourmet Breakfast at both Palace Properties',
      'Private Egyptologist Giza Pyramids and Grand Egyptian Museum Tour',
      'Private Art Historian Guided Tour of the Louvre Museum in Paris',
      'Private Seine River Sunset Cruise on Luxury Salon Boat',
      'Fast-Track Airport Meet & Chauffeur Executive Transfers in Cairo and Paris',
    ],
    excluded: [
      'Commercial Airfare between Cairo and Paris',
      'Schengen and Egypt Visa Fees',
      'Discretionary Dining and Michelin-Starred Restaurant Dinners',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Cairo & Marriott Mena House',
        citySlug: 'cairo',
        description: 'Fast-track airport meet at CAI, transfer to Marriott Mena House, welcome reception facing the pyramids.',
      },
      {
        dayNumber: 2,
        title: 'Giza Pyramids & Grand Egyptian Museum',
        citySlug: 'cairo',
        description: 'Private guided tour of the Great Pyramids and treasures of the Grand Egyptian Museum with certified Egyptologist.',
      },
      {
        dayNumber: 3,
        title: 'Saqqara Step Pyramid & NMEC Royal Mummies',
        citySlug: 'cairo',
        description: 'Private tour of Djoser Step Pyramid at Saqqara and the Royal Mummies at NMEC.',
      },
      {
        dayNumber: 4,
        title: 'Flight from Cairo to Paris & The Ritz Paris',
        citySlug: 'paris',
        description: 'Flight to Paris CDG, private chauffeur transfer to The Ritz Paris on Place Vendôme, welcome champagne.',
      },
      {
        dayNumber: 5,
        title: 'Louvre Museum VIP Tour & Palais Royal',
        citySlug: 'paris',
        description: 'Private art historian-guided tour of Louvre Museum highlights and stroll through historic Palais Royal gardens.',
      },
      {
        dayNumber: 6,
        title: 'Haute Couture & Private Seine River Sunset Cruise',
        citySlug: 'paris',
        description: 'Private shopping promenade along Rue du Faubourg Saint-Honoré and private sunset cruise along the Seine.',
      },
      {
        dayNumber: 7,
        title: 'Château de Versailles & Historic Parisian Gastronomy',
        citySlug: 'paris',
        description: 'Private guided excursion to Château de Versailles royal state apartments and evening gourmet dinner.',
      },
      {
        dayNumber: 8,
        title: 'Breakfast at The Ritz & VIP Departure',
        citySlug: 'paris',
        description: 'Gourmet French breakfast at The Ritz, check-out at 12:00 PM, and private chauffeur transfer to Paris CDG Airport.',
      },
    ],
    seo: {
      title: "Cairo & Paris Luxury Palace Odyssey 8 Days | L'Aube Voyage",
      description:
        'Experience 8 days connecting Cairo Pyramids at Mena House with palace luxury at The Ritz Paris on Place Vendôme.',
      keywords: 'Cairo Paris luxury tour, Mena House Pyramids, The Ritz Paris Place Vendome, luxury dual city tour',
    },
  },

  // 11. EXP-INT-03: The Transcontinental Grand Horizon: Cairo, Dubai and Paris (11D/10N)
  {
    title: 'The Transcontinental Grand Horizon: Cairo, Dubai and Paris',
    slug: 'transcontinental-grand-horizon-cairo-dubai-paris-11d',
    heroAssetKey: 'exp-hero-paris-george-v',
    type: 'package',
    packageMode: 'fixed_date',
    citySlug: 'cairo',
    destinationSlugs: ['dubai', 'paris'],
    price: 325000,
    availability: 'available',
    duration: {
      days: 11,
      nights: 10,
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
        roomCategory: 'Executive Suite, Nile View',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 30000, enabled: true },
          { occupancy: 'single', rateEGP: 24000, enabled: true },
          { occupancy: 'triple', rateEGP: 41000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 2,
        propertySlug: 'armani-hotel-dubai',
        nights: 3,
        roomCategory: 'Armani Signature Suite',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 45000, enabled: true },
          { occupancy: 'single', rateEGP: 36000, enabled: true },
          { occupancy: 'triple', rateEGP: 61000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
      {
        order: 3,
        propertySlug: 'four-seasons-hotel-george-v-paris',
        nights: 4,
        roomCategory: 'Four Seasons Suite with Balcony',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 80000, enabled: true },
          { occupancy: 'single', rateEGP: 65000, enabled: true },
          { occupancy: 'triple', rateEGP: 108000, enabled: true },
          { occupancy: 'quad', rateEGP: 0, enabled: false },
        ],
      },
    ],
    description:
      'The ultimate transcontinental trilogy uniting ancient antiquity in Cairo, futuristic grandeur in Dubai, and palace refinement in Paris at Four Seasons Hotel George V.',
    policies:
      'Free cancellation up to 30 days prior to departure. VIP concierge coordinating all inter-city flight and transfer logistics.',
    included: [
      '3 Nights at The Nile Ritz-Carlton Cairo in Executive Nile Suite',
      '3 Nights at Armani Hotel Dubai in Armani Signature Suite',
      '4 Nights at Four Seasons Hotel George V Paris in Four Seasons Suite with Balcony',
      'Daily Gourmet Breakfast at all 5-Star Palace Properties',
      'Private Egyptologist Giza Pyramids and Grand Egyptian Museum Tour',
      'Private Yacht Cruise in Dubai Marina and Museum of the Future Access',
      'Private Art Historian Louvre Museum Tour and Seine River Private Dinner Cruise',
      'All Private Chauffeur Transfers in Mercedes Executive Vehicles throughout',
    ],
    excluded: [
      'Commercial Flight Tickets (Cairo to Dubai and Dubai to Paris)',
      'Visa Processing Fees for Egypt, UAE, and France',
      'Discretionary Dining, Michelin-Star Dinners, and Spa Treatments',
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival in Cairo & Nile Ritz-Carlton',
        citySlug: 'cairo',
        description: 'VIP meet at Cairo Airport, transfer to The Nile Ritz-Carlton, evening Nile riverfront views.',
      },
      {
        dayNumber: 2,
        title: 'Giza Pyramids & Grand Egyptian Museum',
        citySlug: 'cairo',
        description: 'Private tour of Great Pyramids of Giza, Sphinx, and Grand Egyptian Museum with certified Egyptologist.',
      },
      {
        dayNumber: 3,
        title: 'Royal Mummies at NMEC & Old Cairo',
        citySlug: 'cairo',
        description: 'Private guided visit to the National Museum of Egyptian Civilization and historic Islamic Cairo.',
      },
      {
        dayNumber: 4,
        title: 'Flight to Dubai & Armani Hotel in Burj Khalifa',
        citySlug: 'dubai',
        description: 'Flight to Dubai, private transfer to Armani Hotel Dubai, sunset views of Dubai Fountain.',
      },
      {
        dayNumber: 5,
        title: 'Museum of the Future & Private Dubai Yacht Cruise',
        citySlug: 'dubai',
        description: 'Morning exploration of Museum of the Future, afternoon private yacht cruise around Palm Jumeirah.',
      },
      {
        dayNumber: 6,
        title: 'Dubai Desert Conservation Reserve Safari',
        citySlug: 'dubai',
        description: 'Private 4x4 desert wildlife expedition, falconry presentation, and sunset dinner in royal desert camp.',
      },
      {
        dayNumber: 7,
        title: 'Flight to Paris & Four Seasons Hotel George V',
        citySlug: 'paris',
        description: 'Flight to Paris CDG, private chauffeur transfer to Four Seasons Hotel George V in the Golden Triangle.',
      },
      {
        dayNumber: 8,
        title: 'Louvre Museum VIP Tour & Private Seine Dinner Yacht',
        citySlug: 'paris',
        description: 'Private art historian-guided Louvre Museum tour, evening private dinner cruise on the River Seine.',
      },
      {
        dayNumber: 9,
        title: 'Château de Versailles Royal Apartments',
        citySlug: 'paris',
        description: 'Private tour of the Hall of Mirrors and royal gardens at Château de Versailles.',
      },
      {
        dayNumber: 10,
        title: 'Musée d’Orsay & Parisian Haute Gastronomy',
        citySlug: 'paris',
        description: 'Private morning tour of Musée d’Orsay Impressionist masterpieces, evening fine dining on Avenue Montaigne.',
      },
      {
        dayNumber: 11,
        title: 'Parisian Balcony Breakfast & VIP Departure',
        citySlug: 'paris',
        description: 'Gourmet breakfast on private suite balcony, hotel check-out at 12:00 PM, and private chauffeur transfer to Paris CDG Airport.',
      },
    ],
    seo: {
      title: "Cairo Dubai Paris Grand Tour 11 Days | L'Aube Voyage",
      description:
        'The definitive 11-day transcontinental luxury tour uniting Ritz-Carlton Cairo, Armani Hotel Dubai, and Four Seasons George V Paris.',
      keywords: 'Cairo Dubai Paris tour, 3 city luxury tour, Ritz Carlton Cairo, Armani Dubai, Four Seasons George V Paris',
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
  departureSlotsCreated: number
  experienceDocsMap: Record<string, any>
}

/**
 * Enterprise Experience Seeder for L'Aube Voyage.
 * Ingests 11 normalized canonical experiences with deterministic idempotency.
 * Resolves and attaches verified Media documents to Experience.hero.
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

    // 6. Build Payload Data
    const experiencePayloadData: any = {
      title: expDef.title,
      slug: expDef.slug,
      type: expDef.type,
      city: originCityId,
      destinations: destinationIds.length > 0 ? destinationIds : undefined,
      hero: heroMediaId || undefined,
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
    `   ✅ Experiences Catalog Processed: ${Object.keys(experienceDocsMap).length}/11 journeys (${totalCreated} created, ${totalUpdated} updated, ${heroLinkedCount}/11 Hero Media linked, ${dailyToursCount} Daily Tours, ${packagesCount} Packages, ${accommodationsLinkedCount} Stays linked, STRICT ZERO departure slots).`,
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
    departureSlotsCreated: 0,
    experienceDocsMap,
  }
}
