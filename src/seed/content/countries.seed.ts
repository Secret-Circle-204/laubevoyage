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

export interface CountrySeedDef {
  name: string
  slug: string
  code: string
  currencyCode: string
  defaultLanguageCode: string
  timezone: string
  measurementSystem: 'metric' | 'imperial'
  weekStart: number
  description: string
  seo: {
    title: string
    description: string
    keywords: string
  }
}

export const CANONICAL_COUNTRIES: CountrySeedDef[] = [
  {
    name: 'Egypt',
    slug: 'egypt',
    code: 'EG',
    currencyCode: 'EGP',
    defaultLanguageCode: 'ar',
    timezone: 'Africa/Cairo',
    measurementSystem: 'metric',
    weekStart: 6, // Saturday
    description:
      'Home to over five millennia of continuous civilization, Egypt presents timeless wonders spanning the Giza Plateau, the monumental temples of Luxor and Karnak, Nile River expeditions, and the pristine marine sanctuaries of the Red Sea Riviera.',
    seo: {
      title: "Luxury Egypt Journeys & Private Nile Expeditions | L'Aube Voyage",
      description:
        'Discover bespoke luxury journeys across Egypt. Private Egyptologist tours to the Giza Pyramids, Grand Egyptian Museum, five-star Nile cruises, and Red Sea coastal escapes.',
      keywords: 'Egypt luxury travel, Giza Pyramids private tour, luxury Nile cruise, Grand Egyptian Museum VIP, Red Sea private resort',
    },
  },
  {
    name: 'France',
    slug: 'france',
    code: 'FR',
    currencyCode: 'EUR',
    defaultLanguageCode: 'fr',
    timezone: 'Europe/Paris',
    measurementSystem: 'metric',
    weekStart: 1, // Monday
    description:
      'The global epicentre of haute couture, gastronomy, and classical architecture, France offers curated cultural immersions from Parisian landmark museums to the sun-drenched coastal glamour of the French Riviera and historic Bordeaux vineyards.',
    seo: {
      title: "Bespoke France Travel & Luxury Parisian Itineraries | L'Aube Voyage",
      description:
        'Experience France with bespoke private itineraries. VIP access to Parisian cultural institutions, private French Riviera yacht charters, and premier wine estate tastings.',
      keywords: 'France luxury travel, Paris private tours, French Riviera yacht charter, Bordeaux wine estates, VIP Louvre access',
    },
  },
  {
    name: 'Spain',
    slug: 'spain',
    code: 'ES',
    currencyCode: 'EUR',
    defaultLanguageCode: 'es',
    timezone: 'Europe/Madrid',
    measurementSystem: 'metric',
    weekStart: 1, // Monday
    description:
      'Celebrated for its monumental heritage, avant-garde architecture, and vibrant culinary traditions, Spain weaves royal palaces in Madrid, Gaudí architectural masterpieces in Barcelona, Andalusian Moorish palaces, and Balearic island retreats.',
    seo: {
      title: "Curated Luxury Spain Holidays & Architectural Tours | L'Aube Voyage",
      description:
        'Explore Spain through curated luxury escapes. Private tours of Madrid royal palaces, Barcelona architectural heritage, Seville flamenco traditions, and Balearic private villas.',
      keywords: 'Spain luxury travel, Barcelona private tour, Madrid royal palace VIP, Seville private guide, Ibiza luxury villa',
    },
  },
  {
    name: 'United Arab Emirates',
    slug: 'uae',
    code: 'AE',
    currencyCode: 'AED',
    defaultLanguageCode: 'ar',
    timezone: 'Asia/Dubai',
    measurementSystem: 'metric',
    weekStart: 1, // Monday
    description:
      'A beacon of futuristic luxury and visionary hospitality, the United Arab Emirates pairs iconic architectural wonders and world-class culinary destinations in Dubai with the cultural institutions and tranquil desert landscapes of Abu Dhabi and Ras Al Khaimah.',
    seo: {
      title: "Exclusive UAE Luxury Escapes & Private Desert Safaris | L'Aube Voyage",
      description:
        'Experience the finest luxury in the United Arab Emirates. Ultra-luxury Dubai private suites, Sheikh Zayed Grand Mosque VIP tours, and bespoke desert conservation safaris.',
      keywords: 'UAE luxury travel, Dubai VIP experience, Abu Dhabi private tour, luxury desert safari, Burj Khalifa VIP access',
    },
  },
  {
    name: 'Italy',
    slug: 'italy',
    code: 'IT',
    currencyCode: 'EUR',
    defaultLanguageCode: 'it',
    timezone: 'Europe/Rome',
    measurementSystem: 'metric',
    weekStart: 1, // Monday
    description:
      'With the world’s greatest concentration of UNESCO World Heritage sites, Italy delivers unparalleled journeys across ancient Roman imperial monuments, Florentine Renaissance masterpieces, romantic Venetian waterways, and the cliffside panoramas of the Amalfi Coast.',
    seo: {
      title: "Luxury Italy Tours & Private Cultural Expeditions | L'Aube Voyage",
      description:
        'Discover Italy with private bespoke itineraries. VIP Colosseum and Vatican access, private Venetian gondola voyages, Florence Renaissance art tours, and Amalfi Coast luxury stays.',
      keywords: 'Italy luxury travel, Rome private tour, Venice luxury gondola, Florence private museum guide, Amalfi Coast luxury stay',
    },
  },
  {
    name: 'Saudi Arabia',
    slug: 'saudi-arabia',
    code: 'SA',
    currencyCode: 'SAR',
    defaultLanguageCode: 'ar',
    timezone: 'Asia/Riyadh',
    measurementSystem: 'metric',
    weekStart: 0, // Sunday
    description:
      'At the crossroads of ancient trading routes and ambitious modern vision, Saudi Arabia features the monumental Nabataean rock-cut tombs of Hegra in AlUla, the historic coral stone architecture of Jeddah Al-Balad, and the dynamic metropolis of Riyadh.',
    seo: {
      title: "Bespoke Saudi Arabia Luxury Expeditions & AlUla Heritage | L'Aube Voyage",
      description:
        'Explore Saudi Arabia with bespoke luxury itineraries. Private AlUla desert expeditions, VIP Hegra archaeological tours, and luxury cultural journeys in Riyadh and Jeddah.',
      keywords: 'Saudi Arabia luxury travel, AlUla luxury tour, Hegra private expedition, Riyadh VIP experience, Jeddah Al-Balad tour',
    },
  },
  {
    name: 'Turkey',
    slug: 'turkey',
    code: 'TR',
    currencyCode: 'TRY',
    defaultLanguageCode: 'tr',
    timezone: 'Europe/Istanbul',
    measurementSystem: 'metric',
    weekStart: 1, // Monday
    description:
      'Bridging Europe and Asia across the Bosphorus Strait, Turkey boasts monumental Byzantine and Ottoman imperial heritage in Istanbul, surreal volcanic fairy chimney landscapes in Cappadocia, and the turquoise coastal waters of the Turkish Riviera.',
    seo: {
      title: "Luxury Turkey Journeys & Private Bosphorus Cruises | L'Aube Voyage",
      description:
        'Book bespoke luxury journeys across Turkey. Private Bosphorus yacht charters, sunrise hot-air balloon flights in Cappadocia, and VIP historical sightseeing in Istanbul.',
      keywords: 'Turkey luxury travel, Istanbul private yacht charter, Cappadocia hot air balloon VIP, Hagia Sophia private tour, Antalya luxury resort',
    },
  },
  {
    name: 'United Kingdom',
    slug: 'united-kingdom',
    code: 'GB',
    currencyCode: 'GBP',
    defaultLanguageCode: 'en',
    timezone: 'Europe/London',
    measurementSystem: 'metric',
    weekStart: 1, // Monday
    description:
      'Renowned for its royal heritage, historic castles, and global financial and theatrical hub, the United Kingdom offers quintessential luxury from London’s West End, historic palaces, and world-class museums to the historic royal mile of Edinburgh.',
    seo: {
      title: "Exclusive United Kingdom Luxury Itineraries & Royal Estates | L'Aube Voyage",
      description:
        'Discover the United Kingdom in refined luxury. Private London chauffeur-driven tours, VIP Tower of London access, and bespoke Scottish castle expeditions in Edinburgh.',
      keywords: 'UK luxury travel, London private chauffeur tours, Edinburgh Castle VIP, Tower of London private access, British luxury travel',
    },
  },
  {
    name: 'Japan',
    slug: 'japan',
    code: 'JP',
    currencyCode: 'JPY',
    defaultLanguageCode: 'ja',
    timezone: 'Asia/Tokyo',
    measurementSystem: 'metric',
    weekStart: 0, // Sunday
    description:
      'A harmonious fusion of ancient Zen traditions and state-of-the-art technological innovation, Japan captivates travelers with sacred Shinto shrines, historic Kyoto geisha districts, Michelin-starred culinary excellence, and iconic Mount Fuji vistas.',
    seo: {
      title: "Curated Luxury Japan Journeys & Private Cultural Immersions | L'Aube Voyage",
      description:
        'Experience Japan through bespoke luxury itineraries. Private Tokyo dining reservations, traditional Kyoto ryokan stays, and private Mount Fuji helicopter transfers.',
      keywords: 'Japan luxury travel, Tokyo private tour, Kyoto luxury ryokan, Mount Fuji private tour, Michelin dining Japan',
    },
  },
  {
    name: 'United States',
    slug: 'united-states',
    code: 'US',
    currencyCode: 'USD',
    defaultLanguageCode: 'en',
    timezone: 'America/New_York',
    measurementSystem: 'imperial',
    weekStart: 0, // Sunday
    description:
      'Featuring some of the world’s most dynamic metropolitan skylines, entertainment capitals, and diverse geographic landscapes, the United States delivers world-class private journeys from Manhattan’s iconic avenues to Los Angeles coastal estates and Las Vegas entertainment.',
    seo: {
      title: "Bespoke United States Luxury Travel & City Escapes | L'Aube Voyage",
      description:
        'Discover bespoke luxury travel in the United States. Private Manhattan helicopter transfers, VIP Broadway experiences, and California luxury coastal itineraries.',
      keywords: 'USA luxury travel, New York City private tour, Los Angeles luxury travel, Las Vegas VIP suites, luxury American holidays',
    },
  },
  {
    name: 'Thailand',
    slug: 'thailand',
    code: 'TH',
    currencyCode: 'THB',
    defaultLanguageCode: 'th',
    timezone: 'Asia/Bangkok',
    measurementSystem: 'metric',
    weekStart: 0, // Sunday
    description:
      'Celebrated for its warm hospitality, golden Buddhist temples, and tropical island archipelagos, Thailand offers luxury escapes from Bangkok’s majestic Grand Palace and Michelin-starred culinary scene to the pristine private villa sanctuaries of Phuket.',
    seo: {
      title: "Luxury Thailand Holidays & Private Island Escapes | L'Aube Voyage",
      description:
        'Book curated luxury holidays in Thailand. Private Bangkok canal cruises, VIP Grand Palace guided tours, and exclusive beachfront villa stays in Phuket.',
      keywords: 'Thailand luxury travel, Bangkok private tour, Phuket luxury private villa, Grand Palace VIP tour, Thailand luxury island charter',
    },
  },
  {
    name: 'Greece',
    slug: 'greece',
    code: 'GR',
    currencyCode: 'EUR',
    defaultLanguageCode: 'el',
    timezone: 'Europe/Athens',
    measurementSystem: 'metric',
    weekStart: 1, // Monday
    description:
      'The cradle of Western civilization and Mediterranean island serenity, Greece combines ancient Athenian classical monuments with the iconic whitewashed caldera architecture, volcanic vineyards, and crystalline Aegean waters of Santorini.',
    seo: {
      title: "Bespoke Greece Luxury Vacations & Aegean Catamaran Charters | L'Aube Voyage",
      description:
        'Experience Greece with bespoke luxury itineraries. Private Acropolis and Parthenon tours, luxury Santorini caldera cliffside villas, and private Aegean catamaran voyages.',
      keywords: 'Greece luxury travel, Athens Acropolis private tour, Santorini luxury cliffside villa, Aegean private yacht charter, Greek islands VIP',
    },
  },
]

export interface SeededCountriesResult {
  countryDocsMap: Record<string, any>
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
  heroLinkedCount: number
}

/**
 * Master Enterprise Countries Seeder.
 * Deterministically creates/reconciles the 12 canonical countries with rich metadata and linked Hero Media.
 */
export async function seedCountries(
  payload: Payload,
  mediaAssetMap: Record<string, number>,
): Promise<SeededCountriesResult> {
  console.log('🌍 [Seed] Seeding Authoritative Countries Catalog (12 Canonical Destinations)...')

  // Resolve Currency & Language IDs dynamically from database (SSOT)
  const currenciesRes = await payload.find({ collection: 'currencies', limit: 100 })
  const currencyMap: Record<string, number> = {}
  for (const doc of currenciesRes.docs || []) {
    if (doc.isoCode) currencyMap[doc.isoCode] = doc.id
  }

  const languagesRes = await payload.find({ collection: 'languages', limit: 100 })
  const languageMap: Record<string, number> = {}
  for (const doc of languagesRes.docs || []) {
    if (doc.code) languageMap[doc.code] = doc.id
  }

  const countryDocsMap: Record<string, any> = {}
  let totalCreated = 0
  let totalUpdated = 0
  let heroLinkedCount = 0

  for (const country of CANONICAL_COUNTRIES) {
    const assetKey = `country-hero-${country.code.toLowerCase()}`
    const heroMediaId = mediaAssetMap[assetKey]

    if (!heroMediaId) {
      console.warn(`   ⚠️ Warning: No Hero Media ID found in assetMap for assetKey: ${assetKey}`)
    }

    const currencyId = currencyMap[country.currencyCode] || currencyMap['USD'] || null
    const languageId = languageMap[country.defaultLanguageCode] || languageMap['en'] || null

    const countryPayloadData: any = {
      name: country.name,
      slug: country.slug,
      code: country.code,
      timezone: country.timezone,
      measurementSystem: country.measurementSystem,
      weekStart: country.weekStart,
      isActive: true,
      description: toLexical(country.description),
      seo: country.seo,
    }

    if (currencyId) countryPayloadData.currency = currencyId
    if (languageId) countryPayloadData.defaultLanguage = languageId
    if (heroMediaId) countryPayloadData.hero = heroMediaId

    // 1. Look up existing country by unique canonical code
    const existing = await payload.find({
      collection: 'countries',
      where: {
        code: { equals: country.code },
      },
      limit: 1,
    })

    let countryDoc: any = null

    if (existing.docs.length > 0) {
      const existingId = existing.docs[0].id
      countryDoc = await payload.update({
        collection: 'countries',
        id: existingId,
        data: countryPayloadData,
      })
      totalUpdated++
    } else {
      countryDoc = await payload.create({
        collection: 'countries',
        data: countryPayloadData,
      })
      totalCreated++
    }

    if (countryDoc.hero) {
      heroLinkedCount++
    }

    countryDocsMap[country.slug] = countryDoc
    countryDocsMap[country.code] = countryDoc
  }

  console.log(
    `   ✅ Countries Catalog Processed: ${Object.keys(countryDocsMap).length / 2}/12 countries (${totalCreated} created, ${totalUpdated} updated, ${heroLinkedCount} Hero Media verified).`,
  )

  return {
    countryDocsMap,
    totalProcessed: 12,
    totalCreated,
    totalUpdated,
    heroLinkedCount,
  }
}
