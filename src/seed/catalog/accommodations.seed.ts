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

export interface AccommodationSeedDef {
  name: string
  slug: string
  type: 'hotel' | 'resort' | 'cruise' | 'lodge' | 'camp'
  citySlug: string
  rating: number
  description: string
}

export const CANONICAL_ACCOMMODATIONS: AccommodationSeedDef[] = [
  // ==========================================
  // Cairo (3)
  // ==========================================
  {
    name: 'Four Seasons Hotel Cairo at Nile Plaza',
    slug: 'four-seasons-hotel-cairo-at-nile-plaza',
    type: 'hotel',
    citySlug: 'cairo',
    rating: 5,
    description:
      'Situated in Cairo’s historic Garden City diplomatic quarter, Four Seasons Hotel Cairo at Nile Plaza provides an intimate vantage point over the eternal river. Floor-to-ceiling windows frame feluccas gliding past the skyline, while private marble terraces, acclaimed Italian and Lebanese dining, and a serene spa sanctuary offer an oasis of calm amid the capital’s vibrant rhythm.',
  },
  {
    name: 'Marriott Mena House, Cairo',
    slug: 'marriott-mena-house-cairo',
    type: 'resort',
    citySlug: 'cairo',
    rating: 5,
    description:
      'Nestled at the very foot of the Great Pyramids of Giza amid 40 acres of jasmine-scented gardens, Mena House is a living chapter of Egyptian heritage. Originally a royal hunting palace for Khedive Ismail in 1869, its arabesque corridors, hand-carved mashrabiya woodwork, and unobstructed pyramid vistas create an immortal sanctuary of luxury.',
  },
  {
    name: 'The Nile Ritz-Carlton, Cairo',
    slug: 'the-nile-ritz-carlton-cairo',
    type: 'hotel',
    citySlug: 'cairo',
    rating: 5,
    description:
      'Commanding an iconic downtown presence between the Nile River and historic Tahrir Square, The Nile Ritz-Carlton stands adjacent to the Egyptian Antiquities Museum. Combining mid-century architectural glamour with refined modern Arabian hospitality, guests enjoy panoramic river sunsets, private cabana lounges, and world-class culinary artistry.',
  },

  // ==========================================
  // Luxor (2)
  // ==========================================
  {
    name: 'Sofitel Winter Palace Luxor',
    slug: 'sofitel-winter-palace-luxor',
    type: 'hotel',
    citySlug: 'luxor',
    rating: 5,
    description:
      'Built in 1886 by British explorers along the tranquil Nile Corniche, the Winter Palace has hosted monarchs, archaeological pioneers, and literary icons including Agatha Christie. Soaring ceilings, antique crystal chandeliers, and century-old royal botanical gardens provide a poetic gateway to the Valley of the Kings.',
  },
  {
    name: 'Hilton Luxor Resort & Spa',
    slug: 'hilton-luxor-resort-and-spa',
    type: 'resort',
    citySlug: 'luxor',
    rating: 5,
    description:
      'Located on the serene eastern bank of the Nile in New Karnak, this holistic resort offers infinity swimming pools that seamlessly merge with the river current. Sunken sunset seating lounges and panoramic West Bank sunset views make it an idyllic sanctuary for restorative luxury after private temple expeditions.',
  },

  // ==========================================
  // Aswan (2)
  // ==========================================
  {
    name: 'Sofitel Legend Old Cataract Aswan',
    slug: 'sofitel-legend-old-cataract-aswan',
    type: 'hotel',
    citySlug: 'aswan',
    rating: 5,
    description:
      'Perched upon a pink granite promontory overlooking the golden dunes of Elephantine Island and the first cataract of the Nile, the Old Cataract is the crown jewel of Upper Egypt. Combining Victorian grandeur with Byzantine and Moorish aesthetics, this legend offers peerless veranda sunsets where Winston Churchill and Howard Carter once gazed upon the river.',
  },
  {
    name: 'Mövenpick Resort Aswan',
    slug: 'movenpick-resort-aswan',
    type: 'resort',
    citySlug: 'aswan',
    rating: 5,
    description:
      'Reached exclusively by private river shuttle to Elephantine Island, this lush island sanctuary provides 360-degree views of the Nile rapids, ancient Nubian ruins, and the botanical haven of Kitchener’s Island. Private villas and sunset terraces offer complete seclusion surrounded by the river.',
  },

  // ==========================================
  // Nile Cruisers (2)
  // ==========================================
  {
    name: 'The Oberoi Zahra Luxury Nile Cruiser',
    slug: 'the-oberoi-zahra-luxury-nile-cruiser',
    type: 'cruise',
    citySlug: 'luxor',
    rating: 5,
    description:
      'An intimate boutique cruiser accommodating discerning travelers in sublime serenity. Featuring 27 full-sized luxury cabins, private spa suites with dedicated therapy rooms, an open-air riverfront swimming pool on the sun deck, fine gourmet dining, and unhurried sailing between Karnak and Philae with private Egyptologist escorts.',
  },
  {
    name: 'Sonesta St. George I Nile Cruise',
    slug: 'sonesta-st-george-i-nile-cruise',
    type: 'cruise',
    citySlug: 'aswan',
    rating: 5,
    description:
      'A masterpiece of classical French design on the waters of the Nile. Featuring double-glazed floor-to-ceiling panoramic windows in all cabins, marble bathrooms, upscale wellness facilities, and elegant dining salons, it transforms ancient river navigation into a five-star journey through pharaonic history.',
  },

  // ==========================================
  // Red Sea Coast (2)
  // ==========================================
  {
    name: 'Four Seasons Resort Sharm El Sheikh',
    slug: 'four-seasons-resort-sharm-el-sheikh',
    type: 'resort',
    citySlug: 'sharm-el-sheikh',
    rating: 5,
    description:
      'Cascading down palm-fringed limestone cliffs toward a private 1-kilometer coral reef in Ras Nasrani, this palatial Arabian seaside sanctuary blends year-round Red Sea sunshine with private yacht excursions, world-class dive canyons, private plunge pools, and cliffside dining facing Tiran Island.',
  },
  {
    name: 'The Oberoi Beach Resort, Sahl Hasheesh',
    slug: 'the-oberoi-beach-resort-sahl-hasheesh',
    type: 'resort',
    citySlug: 'hurghada',
    rating: 5,
    description:
      'An all-suite sanctuary spread over 48 acres with classical Arabic domed pavilions, soothing arcades, and private walled courtyards along an exclusive stretch of the Red Sea. Guests enjoy absolute privacy, sunken marble baths, private swimming pool suites, and direct access to protected marine reserves.',
  },

  // ==========================================
  // Alexandria (1)
  // ==========================================
  {
    name: 'Four Seasons Hotel Alexandria at San Stefano',
    slug: 'four-seasons-hotel-alexandria-at-san-stefano',
    type: 'hotel',
    citySlug: 'alexandria',
    rating: 5,
    description:
      'Evoking the golden age of Mediterranean seaside glamour along the historic Corniche. Featuring private beach cabanas, fresh seafood gastronomy, an infinity pool overlooking the Mediterranean, and Greco-Roman-inspired architectural elegance celebrating Alexandria’s cosmopolitan maritime spirit.',
  },

  // ==========================================
  // Dubai (2)
  // ==========================================
  {
    name: 'Al Maha, a Luxury Collection Desert Resort & Spa, Dubai',
    slug: 'al-maha-desert-resort-and-spa-dubai',
    type: 'camp',
    citySlug: 'dubai',
    rating: 5,
    description:
      'A discreet desert sanctuary secluded within the tranquil dunes of the Dubai Desert Conservation Reserve. Individual Bedouin tented suites with private temperature-controlled infinity pools provide an intimate connection with free-roaming herds of Arabian oryx and gazelles under starlit Arabian desert skies.',
  },
  {
    name: 'Armani Hotel Dubai',
    slug: 'armani-hotel-dubai',
    type: 'hotel',
    citySlug: 'dubai',
    rating: 5,
    description:
      'Nestled directly inside the Burj Khalifa and personally conceived by Giorgio Armani. Featuring curved tatami walls, Japanese minimalist aesthetic, Italian marble finishes, and dedicated Lifestyle Managers who curate bespoke luxury experiences in the heart of Downtown Dubai.',
  },

  // ==========================================
  // Paris (2)
  // ==========================================
  {
    name: 'The Ritz Paris',
    slug: 'the-ritz-paris',
    type: 'hotel',
    citySlug: 'paris',
    rating: 5,
    description:
      'The ultimate benchmark of Parisian haute hôtellerie on Place Vendôme. From the historic salons that welcomed Coco Chanel, Marcel Proust, and Ernest Hemingway to the serene French gardens and Michelin-starred dining, The Ritz remains an eternal icon of French refinement, craftsmanship, and palace prestige.',
  },
  {
    name: 'Four Seasons Hotel George V, Paris',
    slug: 'four-seasons-hotel-george-v-paris',
    type: 'hotel',
    citySlug: 'paris',
    rating: 5,
    description:
      'An Art Deco palace landmark in the Golden Triangle off the Champs-Élysées, celebrated globally for its monumental floral art installations by Jeff Leatham, five Michelin stars across three renowned restaurants, and quintessentially Parisian palace distinction.',
  },

  // ==========================================
  // Abu Dhabi (1)
  // ==========================================
  {
    name: 'Emirates Palace Mandarin Oriental, Abu Dhabi',
    slug: 'emirates-palace-mandarin-oriental-abu-dhabi',
    type: 'hotel',
    citySlug: 'abu-dhabi',
    rating: 5,
    description:
      'A globally revered palace landmark of Arabian hospitality located on the Corniche in Abu Dhabi. Featuring lavish gold-leaf ceilings, 1.3 kilometers of private pristine beach, marble terraces overlooking the Arabian Gulf, private butler service, and Michelin-starred dining celebrating regal Emirati and international gastronomy.',
  },

  // ==========================================
  // Nice (1)
  // ==========================================
  {
    name: 'Hôtel Palais de la Méditerranée, Nice',
    slug: 'hotel-palais-de-la-mediterranee-nice',
    type: 'hotel',
    citySlug: 'nice',
    rating: 5,
    description:
      'A legendary Art Deco palace on the Promenade des Anglais in Nice. Featuring an iconic 1930s listed façade, expansive swimming terrace overlooking the azure Baie des Anges, refined Mediterranean gastronomy, and immediate access to the glamour of the French Riviera.',
  },

  // ==========================================
  // Rome (1)
  // ==========================================
  {
    name: 'Hotel de Russie, Rome',
    slug: 'hotel-de-russie-rome',
    type: 'hotel',
    citySlug: 'rome',
    rating: 5,
    description:
      'A Rocco Forte hotel sanctuary situated between the Spanish Steps and Piazza del Popolo in Rome. Celebrated for its terraced secret garden, classical architecture infused with contemporary Italian design, tranquil wellness spa, and prestigious Le Jardin de Russie restaurant.',
  },

  // ==========================================
  // Florence (1)
  // ==========================================
  {
    name: 'The St. Regis Florence',
    slug: 'the-st-regis-florence',
    type: 'hotel',
    citySlug: 'florence',
    rating: 5,
    description:
      'A historic Renaissance palace designed by Filippo Brunelleschi along the banks of the Arno River in Florence. Adorned with antique crystal chandeliers, 16th-century frescoes, bespoke St. Regis Butler service, and Michelin-starred Tuscan culinary experiences in the heart of the city.',
  },

  // ==========================================
  // Venice (1)
  // ==========================================
  {
    name: 'Hotel Danieli, Venice',
    slug: 'hotel-danieli-venice',
    type: 'hotel',
    citySlug: 'venice',
    rating: 5,
    description:
      'A masterwork of Venetian gothic architecture on the Riva degli Schiavoni overlooking the Venetian Lagoon. Dating back to the 14th century as Palazzo Dandolo, it features soaring gold staircases, Murano glass chandeliers, and panoramic views of the Grand Canal and San Giorgio Maggiore.',
  },
]

export interface SeededAccommodationsResult {
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
  cityLinkedCount: number
  accommodationDocsMap: Record<string, any>
}

/**
 * Enterprise Accommodation Seeder for L'Aube Voyage.
 * Ingests 21 verified luxury properties with deterministic idempotency.
 */
export async function seedAccommodations(
  payload: Payload,
  cityDocsMap: Record<string, any>,
): Promise<SeededAccommodationsResult> {
  console.log("🏨 [Seed] Ingesting & Resolving Luxury Accommodations (21 Verified Properties)...")

  let totalCreated = 0
  let totalUpdated = 0
  let cityLinkedCount = 0
  const accommodationDocsMap: Record<string, any> = {}

  for (const property of CANONICAL_ACCOMMODATIONS) {
    const cityDoc = cityDocsMap[property.citySlug]

    if (!cityDoc || !cityDoc.id) {
      throw new Error(
        `[AccommodationSeed] City '${property.citySlug}' not found in cityDocsMap for property '${property.name}'`,
      )
    }

    const accommodationPayloadData = {
      name: property.name,
      slug: property.slug,
      type: property.type,
      city: Number(cityDoc.id),
      rating: property.rating,
      description: toLexical(property.description),
      isActive: true,
    }

    // 1. Idempotent lookup by unique canonical slug
    const existing = await payload.find({
      collection: 'accommodations',
      where: {
        slug: { equals: property.slug },
      },
      limit: 1,
    })

    let doc: any = null

    if (existing.docs.length > 0) {
      const existingId = existing.docs[0].id
      doc = await payload.update({
        collection: 'accommodations',
        id: existingId,
        data: accommodationPayloadData as any,
      })
      totalUpdated++
    } else {
      doc = await payload.create({
        collection: 'accommodations',
        data: accommodationPayloadData as any,
      })
      totalCreated++
    }

    if (doc.city) {
      cityLinkedCount++
    }

    accommodationDocsMap[property.slug] = doc
  }

  console.log(
    `   ✅ Accommodations Catalog Processed: ${Object.keys(accommodationDocsMap).length}/21 properties (${totalCreated} created, ${totalUpdated} updated, ${cityLinkedCount}/21 City relationships verified).`,
  )

  return {
    totalProcessed: CANONICAL_ACCOMMODATIONS.length,
    totalCreated,
    totalUpdated,
    cityLinkedCount,
    accommodationDocsMap,
  }
}
