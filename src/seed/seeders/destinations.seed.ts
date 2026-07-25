import type { Payload } from 'payload'

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

export interface SeededDestinationsResult {
  countries: Record<string, any>
  cities: Record<string, any>
}

export interface DestinationCountryData {
  name: string
  slug: string
  code: string
  description: string
  cities: Array<{
    name: string
    slug: string
    description: string
  }>
}

/**
 * World Master Tourism Destinations Catalog
 * Ordered by international tourist arrival rankings & luxury travel demand.
 */
export const TOURISM_DESTINATIONS_DATA: DestinationCountryData[] = [
  // 1. Egypt — Middle East & Ancient Wonders Peak
  {
    name: 'Egypt',
    slug: 'egypt',
    code: 'EG',
    description: 'Land of Pharaohs, Giza Pyramids, Nile River cruises, and vibrant Red Sea coral reefs.',
    cities: [
      { name: 'Cairo', slug: 'cairo', description: 'Vibrant capital hosting the Giza Pyramids, Grand Egyptian Museum, and Khan El Khalili.' },
      { name: 'Luxor', slug: 'luxor', description: 'The world\'s greatest open-air museum featuring Karnak Temple and Valley of the Kings.' },
      { name: 'Aswan', slug: 'aswan', description: 'Nile felucca cruises, Philae Temple, and authentic Nubian culture.' },
      { name: 'Hurghada', slug: 'hurghada', description: 'Red Sea Riviera destination famous for diving, coral reefs, and desert safaris.' },
      { name: 'Sharm El Sheikh', slug: 'sharm-el-sheikh', description: 'Luxury Red Sea resort city with Ras Mohammed National Park marine life.' },
      { name: 'Alexandria', slug: 'alexandria', description: 'Pearl of the Mediterranean featuring Citadel of Qaitbay and Bibliotheca Alexandrina.' },
    ],
  },

  // 2. France — World's #1 Most Visited Tourism Nation
  {
    name: 'France',
    slug: 'france',
    code: 'FR',
    description: 'The world\'s most visited destination, renowned for Paris, haute cuisine, fine wine, and romance.',
    cities: [
      { name: 'Paris', slug: 'paris', description: 'City of Light featuring Eiffel Tower, Louvre Museum, Notre-Dame, and Champs-Élysées.' },
      { name: 'Nice', slug: 'nice', description: 'Capital of the French Riviera, famous for Promenade des Anglais and Azure coastline.' },
      { name: 'Lyon', slug: 'lyon', description: 'Gastronomic capital of France with rich UNESCO heritage and Renaissance architecture.' },
      { name: 'Bordeaux', slug: 'bordeaux', description: 'World-famous wine hub surrounded by historic vineyards and classical French estates.' },
    ],
  },

  // 3. Spain — World's #2 Global Tourism Powerhouse
  {
    name: 'Spain',
    slug: 'spain',
    code: 'ES',
    description: 'Sun-drenched beaches, Gaudí architecture, tapas culture, and vibrant Flamenco traditions.',
    cities: [
      { name: 'Madrid', slug: 'madrid', description: 'Royal capital featuring Prado Museum, Royal Palace, and lively Retiro Park.' },
      { name: 'Barcelona', slug: 'barcelona', description: 'Mediterranean coastal city adorned with Gaudí\'s Sagrada Família and Gothic Quarter.' },
      { name: 'Seville', slug: 'seville', description: 'Heart of Andalusia with Royal Alcázar, Plaza de España, and Flamenco heritage.' },
      { name: 'Ibiza', slug: 'ibiza', description: 'World-renowned Balearic Island offering luxury beach clubs and pristine Mediterranean waters.' },
    ],
  },

  // 4. United Arab Emirates — Middle East Luxury Hub
  {
    name: 'United Arab Emirates',
    slug: 'uae',
    code: 'AE',
    description: 'Ultramodern luxury, futuristic architecture, world-class shopping, and desert safaris.',
    cities: [
      { name: 'Dubai', slug: 'dubai', description: 'Global luxury capital featuring Burj Khalifa, Palm Jumeirah, and Dubai Mall.' },
      { name: 'Abu Dhabi', slug: 'abu-dhabi', description: 'UAE capital hosting Sheikh Zayed Grand Mosque, Louvre Abu Dhabi, and Yas Island.' },
      { name: 'Ras Al Khaimah', slug: 'ras-al-khaimah', description: 'Adventure and beach resort oasis nestled between Jebel Jais mountains and Arabian Gulf.' },
    ],
  },

  // 5. Italy — Cradle of Art, History & Gastronomy
  {
    name: 'Italy',
    slug: 'italy',
    code: 'IT',
    description: 'Unmatched UNESCO heritage, Roman monuments, Renaissance masterpieces, and Italian cuisine.',
    cities: [
      { name: 'Rome', slug: 'rome', description: 'The Eternal City with the Colosseum, Pantheon, Trevi Fountain, and Vatican City.' },
      { name: 'Venice', slug: 'venice', description: 'Romantic canal city featuring gondola rides, St. Mark\'s Basilica, and Doge\'s Palace.' },
      { name: 'Florence', slug: 'florence', description: 'Cradle of the Renaissance boasting the Duomo, Uffizi Gallery, and Ponte Vecchio.' },
      { name: 'Milan', slug: 'milan', description: 'Global fashion capital featuring Duomo di Milano and Galleria Vittorio Emanuele II.' },
      { name: 'Amalfi Coast', slug: 'amalfi-coast', description: 'Cliffside Mediterranean villages including Positano, Amalfi, and Ravello.' },
    ],
  },

  // 6. Saudi Arabia — Crossroads of History & Vision
  {
    name: 'Saudi Arabia',
    slug: 'saudi-arabia',
    code: 'SA',
    description: 'Historic trade routes, UNESCO archaeological sites, and visionary luxury tourism megaprojects.',
    cities: [
      { name: 'Riyadh', slug: 'riyadh', description: 'Dynamic capital blending Diriyah historic mudbrick palaces with Kingdom Centre.' },
      { name: 'Jeddah', slug: 'jeddah', description: 'Red Sea coastal gateway featuring Al-Balad UNESCO historic district and waterfront corniche.' },
      { name: 'AlUla', slug: 'alula', description: 'Ancient oasis hosting Hegra UNESCO Nabataean tombs and dramatic desert canyons.' },
    ],
  },

  // 7. Turkey — Where East Meets West
  {
    name: 'Turkey',
    slug: 'turkey',
    code: 'TR',
    description: 'Crossroads of Europe and Asia, famous for Byzantine domes, Ottoman palaces, and balloon flights.',
    cities: [
      { name: 'Istanbul', slug: 'istanbul', description: 'Transcontinental metropolis featuring Hagia Sophia, Blue Mosque, and Bosphorus Strait.' },
      { name: 'Cappadocia', slug: 'cappadocia', description: 'Fairy chimney rock formations, hot-air balloon flights, and ancient underground cities.' },
      { name: 'Antalya', slug: 'antalya', description: 'Turkish Riviera resort hub with turquoise beaches and Roman ruins.' },
    ],
  },

  // 8. United Kingdom — Royal Heritage & Global Metropolis
  {
    name: 'United Kingdom',
    slug: 'united-kingdom',
    code: 'GB',
    description: 'Monarchic palaces, historic castles, iconic landmarks, and lush countryside estates.',
    cities: [
      { name: 'London', slug: 'london', description: 'Global hub boasting Big Ben, Tower of London, Buckingham Palace, and West End theaters.' },
      { name: 'Edinburgh', slug: 'edinburgh', description: 'Historic Scottish capital with Edinburgh Castle, Royal Mile, and cobblestone charm.' },
    ],
  },

  // 9. Japan — Harmony of Tradition & High-Tech Future
  {
    name: 'Japan',
    slug: 'japan',
    code: 'JP',
    description: 'Ancient Shinto shrines, cherry blossoms, Mount Fuji, high-speed bullet trains, and culinary excellence.',
    cities: [
      { name: 'Tokyo', slug: 'tokyo', description: 'Hyper-modern capital blending Shibuya Crossing and Tokyo Skytree with ancient Senso-ji Temple.' },
      { name: 'Kyoto', slug: 'kyoto', description: 'Cultural heart of Japan featuring Fushimi Inari Shrine, bamboo groves, and geisha districts.' },
      { name: 'Osaka', slug: 'osaka', description: 'Street food haven and vibrant entertainment metropolis famous for Dotonbori and Osaka Castle.' },
    ],
  },

  // 10. United States — Diverse Landscapes & Iconic Cities
  {
    name: 'United States',
    slug: 'united-states',
    code: 'US',
    description: 'Iconic skylines, entertainment capitals, natural national parks, and coastal beaches.',
    cities: [
      { name: 'New York City', slug: 'new-york-city', description: 'The Big Apple featuring Times Square, Central Park, Statue of Liberty, and Broadway.' },
      { name: 'Los Angeles', slug: 'los-angeles', description: 'Entertainment capital boasting Hollywood Walk of Fame, Santa Monica Pier, and Beverly Hills.' },
      { name: 'Las Vegas', slug: 'las-vegas', description: 'Global entertainment hub known for luxury resorts, world-class shows, and nightlife.' },
    ],
  },

  // 11. Thailand — Golden Temples & Tropical Islands
  {
    name: 'Thailand',
    slug: 'thailand',
    code: 'TH',
    description: 'Land of Smiles, featuring ornate Buddhist temples, tropical beaches, and aromatic street food.',
    cities: [
      { name: 'Bangkok', slug: 'bangkok', description: 'Vibrant capital with Grand Palace, Wat Arun, floating markets, and nightlife.' },
      { name: 'Phuket', slug: 'phuket', description: 'Thailand\'s largest tropical island famous for Patong Beach, Phi Phi day trips, and resorts.' },
    ],
  },

  // 12. Greece — Aegean Islands & Classical Mythology
  {
    name: 'Greece',
    slug: 'greece',
    code: 'GR',
    description: 'Birthplace of democracy, Aegean island paradises, white-washed villages, and ancient ruins.',
    cities: [
      { name: 'Athens', slug: 'athens', description: 'Historical capital featuring the Acropolis, Parthenon temple, and Plaka district.' },
      { name: 'Santorini', slug: 'santorini', description: 'Iconic volcanic island with Oia sunset views, blue-domed churches, and caldera cliffs.' },
    ],
  },
]

export async function seedDestinations(payload: Payload): Promise<SeededDestinationsResult> {
  console.log('🌍 [Seed] Seeding Master Destinations Catalog (Countries & Cities)...')

  const countryDocsMap: Record<string, any> = {}
  const cityDocsMap: Record<string, any> = {}

  for (const countryData of TOURISM_DESTINATIONS_DATA) {
    let countryDoc: any = null

    try {
      countryDoc = await payload.create({
        collection: 'countries',
        data: {
          name: countryData.name,
          slug: countryData.slug,
          code: countryData.code,
          isActive: true,
          description: toLexical(countryData.description),
        },
      })
    } catch {
      const existing = await payload.find({
        collection: 'countries',
        where: { slug: { equals: countryData.slug } },
        limit: 1,
      })
      countryDoc = existing.docs[0]
    }

    countryDocsMap[countryData.slug] = countryDoc

    if (countryDoc) {
      for (const cityData of countryData.cities) {
        let cityDoc: any = null

        try {
          cityDoc = await payload.create({
            collection: 'cities',
            data: {
              name: cityData.name,
              slug: cityData.slug,
              country: countryDoc.id,
              isActive: true,
              description: toLexical(cityData.description),
            },
          })
        } catch {
          const existing = await payload.find({
            collection: 'cities',
            where: { slug: { equals: cityData.slug } },
            limit: 1,
          })
          cityDoc = existing.docs[0]
        }

        cityDocsMap[cityData.slug] = cityDoc
      }
    }
  }

  console.log(`   ✅ Destinations Catalog initialized (${Object.keys(countryDocsMap).length} Countries, ${Object.keys(cityDocsMap).length} Cities created).`)
  return {
    countries: countryDocsMap,
    cities: cityDocsMap,
  }
}
