import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

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

async function seedRealE2EExperiences() {
  console.log('🚀 [Seed] Initializing Payload for Real E2E Experiences...')
  const payload = await getPayload({ config: configPromise })

  // 1. Resolve or Seed Authoritative Country: Egypt (SSOT Timezone: Africa/Cairo)
  let egyptRes = await payload.find({
    collection: 'countries',
    where: { code: { equals: 'EG' } },
    limit: 1,
  })

  let egyptId: number
  if (egyptRes.docs.length === 0) {
    const createdCountry = await payload.create({
      collection: 'countries',
      data: {
        name: 'Egypt',
        slug: 'egypt',
        code: 'EG',
        timezone: 'Africa/Cairo',
        measurementSystem: 'metric',
        weekStart: 6, // Saturday in Egypt
        isActive: true,
      } as any,
    })
    egyptId = createdCountry.id
    console.log(`📍 [Seed] Created Authoritative Country: Egypt (#${egyptId}) [TZ: Africa/Cairo]`)
  } else {
    egyptId = egyptRes.docs[0].id
    // Ensure timezone is strictly Africa/Cairo
    if (!egyptRes.docs[0].timezone) {
      await payload.update({
        collection: 'countries',
        id: egyptId,
        data: { timezone: 'Africa/Cairo' } as any,
      })
    }
    console.log(`📍 [Seed] Resolved Country: Egypt (#${egyptId}) [TZ: Africa/Cairo]`)
  }

  // 2. Resolve or Seed Cities: Cairo and Hurghada
  let cairoRes = await payload.find({
    collection: 'cities',
    where: { name: { equals: 'Cairo' } },
    limit: 1,
  })
  let cairoId: number
  if (cairoRes.docs.length === 0) {
    const createdCairo = await payload.create({
      collection: 'cities',
      data: {
        name: 'Cairo',
        slug: 'cairo',
        country: egyptId,
        isActive: true,
      } as any,
    })
    cairoId = createdCairo.id
    console.log(`📍 [Seed] Created Destination City: Cairo (#${cairoId})`)
  } else {
    cairoId = cairoRes.docs[0].id
  }

  let hurghadaRes = await payload.find({
    collection: 'cities',
    where: { name: { equals: 'Hurghada' } },
    limit: 1,
  })
  let hurghadaId: number
  if (hurghadaRes.docs.length === 0) {
    const createdHurghada = await payload.create({
      collection: 'cities',
      data: {
        name: 'Hurghada',
        slug: 'hurghada',
        country: egyptId,
        isActive: true,
      } as any,
    })
    hurghadaId = createdHurghada.id
    console.log(`📍 [Seed] Created Destination City: Hurghada (#${hurghadaId})`)
  } else {
    hurghadaId = hurghadaRes.docs[0].id
  }

  console.log(
    `📍 [Seed] Destination Cities confirmed: Cairo (#${cairoId}), Hurghada (#${hurghadaId})`,
  )

  // =========================================================================
  // 1. DAILY TOUR: Giza Pyramids and Grand Egyptian Museum Private Tour
  // =========================================================================
  console.log('🌱 [Seed 1/3] Creating / Updating Daily Tour Experience...')
  const dailyTourSlug = 'giza-pyramids-gem-private-tour'
  const existingDaily = await payload.find({
    collection: 'experiences',
    where: { slug: { equals: dailyTourSlug } },
    limit: 1,
  })

  const dailyTourData = {
    title: 'Giza Pyramids and Grand Egyptian Museum Private Tour',
    slug: dailyTourSlug,
    type: 'daily_tour' as const,
    city: cairoId,
    price: 3500,
    availability: 'available' as const,
    isActive: true,
    duration: {
      durationMinutes: 180, // 3 Hours (Domain SSOT for daily tours)
    },
    schedules: [
      { startTime: '09:00', defaultCapacity: 20, label: 'Morning Departure (09:00 AM)' },
      { startTime: '13:00', defaultCapacity: 20, label: 'Afternoon Departure (01:00 PM)' },
      { startTime: '17:00', defaultCapacity: 20, label: 'Sunset Departure (05:00 PM)' },
    ],
    included: [
      { item: 'Private Certified Egyptologist Tour Guide' },
      { item: 'VIP Air-Conditioned Mercedes Luxury Transport' },
      { item: 'All Monument and GEM Exhibition Entrance Tickets' },
      { item: 'Chilled Mineral Water, Fresh Juices and Traditional Snacks' },
    ],
    excluded: [
      { item: 'Tipping and Gratuities for Guide and Driver' },
      { item: 'Personal Expenses and Souvenirs' },
      { item: 'Optional Camel or Horse Carriage Ride' },
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'Giza Plateau, Great Sphinx and Grand Egyptian Museum Exploration',
        description:
          'Private guided tour covering the Great Pyramid of Khufu, Khafre, Menkaure, the panoramic viewpoint, Great Sphinx, and the world-class Grand Egyptian Museum featuring King Tutankhamun treasures.',
      },
    ],
    description: toLexical(
      'Embark on an unforgettable journey through 5,000 years of ancient history with our private Egyptologist tour to the Giza Pyramids and the new Grand Egyptian Museum in absolute luxury.',
    ),
    policies: toLexical(
      'Full refund for cancellations made at least 24 hours before the scheduled tour departure. Instant booking confirmation.',
    ),
    seo: {
      title: 'Giza Pyramids and Grand Egyptian Museum Tour | Laube Voyage',
      description:
        'Book a luxury private tour to the Giza Pyramids and GEM with private transport and guide.',
      keywords: 'Giza Pyramids, Grand Egyptian Museum, Cairo Day Tour, Egypt Luxury Travel',
    },
  }

  let dailyTourId: number
  if (existingDaily.docs.length > 0) {
    const updated = await payload.update({
      collection: 'experiences',
      id: existingDaily.docs[0].id,
      data: dailyTourData,
    })
    dailyTourId = updated.id
    console.log(`✅ [Seed] Daily Tour updated (ID: #${dailyTourId})`)
  } else {
    const created = await payload.create({
      collection: 'experiences',
      data: dailyTourData,
    })
    dailyTourId = created.id
    console.log(`✅ [Seed] Daily Tour created (ID: #${dailyTourId})`)
  }

  // =========================================================================
  // 2. FIXED PACKAGE: Cairo and Nile Express - 3 Days Luxury Fixed Package
  // =========================================================================
  console.log('🌱 [Seed 2/3] Creating / Updating Fixed Package Experience...')
  const fixedPackageSlug = 'cairo-nile-express-3-days-fixed'
  const existingFixed = await payload.find({
    collection: 'experiences',
    where: { slug: { equals: fixedPackageSlug } },
    limit: 1,
  })

  const fixedPackageData = {
    title: 'Cairo and Nile Express - 3 Days Luxury Fixed Package',
    slug: fixedPackageSlug,
    type: 'package' as const,
    packageMode: 'fixed_date' as const,
    city: cairoId,
    price: 12500,
    availability: 'available' as const,
    isActive: true,
    duration: {
      days: 3,
      nights: 2,
    },
    included: [
      { item: '5-Star Luxury Nile-View Hotel Accommodation (2 Nights)' },
      { item: 'Daily Gourmet Buffet Breakfast and Welcome Nile Dinner Cruise' },
      { item: 'Full-Day Pyramids, Egyptian Museum and Old Cairo Sightseeing' },
      { item: 'VIP Airport Meet and Greet with Private Mercedes Transfers' },
    ],
    excluded: [
      { item: 'International Flight Tickets' },
      { item: 'Comprehensive Travel Insurance' },
      { item: 'Alcoholic Beverages and Premium Minibar Items' },
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Arrival and Nile Dinner Cruise',
        description:
          'VIP airport transfer to your 5-star hotel, evening relaxation, and authentic 5-star Nile dinner cruise with live oriental show.',
      },
      {
        dayNumber: 2,
        title: 'Giza Pyramids, Citadel and Khan El Khalili Bazaar',
        description:
          'Full-day VIP guided tour exploring the Giza Pyramids, Sphinx, Saladin Citadel, and vibrant Khan El Khalili historic market.',
      },
      {
        dayNumber: 3,
        title: 'National Museum of Egyptian Civilization and VIP Departure',
        description:
          'Morning visit to NMEC Royal Mummies Hall, checkout at 12:00 PM local time, and private transfer to Cairo International Airport.',
      },
    ],
    description: toLexical(
      'Discover the best of Cairo in a curated 3-day luxury fixed package featuring 5-star accommodations, private Egyptologist guidance, and seamless VIP logistics.',
    ),
    policies: toLexical(
      'Checkout policy: Last day checkout at 12:00 PM local Cairo time. Free cancellation up to 7 days prior to departure.',
    ),
    seo: {
      title: 'Cairo 3 Days Luxury Fixed Package | Laube Voyage',
      description:
        'Experience Cairo in 3 days with 5-star luxury hotels, Nile dinner cruise, and private guided sightseeing.',
      keywords: 'Cairo Package, Egypt 3 Days, Nile Cruise, Luxury Travel Egypt',
    },
  }

  let fixedPackageId: number
  if (existingFixed.docs.length > 0) {
    const updated = await payload.update({
      collection: 'experiences',
      id: existingFixed.docs[0].id,
      data: fixedPackageData,
    })
    fixedPackageId = updated.id
    console.log(`✅ [Seed] Fixed Package updated (ID: #${fixedPackageId})`)
  } else {
    const created = await payload.create({
      collection: 'experiences',
      data: fixedPackageData,
    })
    fixedPackageId = created.id
    console.log(`✅ [Seed] Fixed Package created (ID: #${fixedPackageId})`)
  }

  // Generate departure slots for Fixed Package across multiple calendar dates
  const today = new Date()
  const departureDates: string[] = []

  // Seed dates: fixed set + next 30 days every 2-3 days
  const baseDates = [
    '2026-08-22',
    '2026-08-23',
    '2026-08-24',
    '2026-08-25',
    '2026-08-26',
    '2026-08-28',
    '2026-09-01',
    '2026-09-05',
    '2026-09-10',
    '2026-09-15',
    '2026-09-20',
    '2026-10-01',
    '2026-10-15',
    '2026-11-01',
  ]

  for (const d of baseDates) {
    if (!departureDates.includes(d)) departureDates.push(d)
  }

  for (const depDate of departureDates) {
    const depId = `slot_cairo_fixed_${fixedPackageId}_${depDate.replace(/-/g, '_')}`
    const existingSlot = await payload.find({
      collection: 'departure-slots',
      where: { departureId: { equals: depId } },
      limit: 1,
    })

    if (existingSlot.docs.length === 0) {
      await payload.create({
        collection: 'departure-slots',
        data: {
          departureId: depId,
          experience: fixedPackageId,
          date: depDate,
          startTime: '10:00',
          capacityTotal: 20,
          capacityAvailable: 20,
          capacityReserved: 0,
          capacitySold: 0,
          status: 'available',
          version: 1,
        },
      })
      console.log(`   📅 Created Departure Slot: ${depDate} @ 10:00 (ID: ${depId})`)
    }
  }

  // =========================================================================
  // 3. FLEXIBLE PACKAGE: Red Sea and Desert Safari - 4 Days Flexible Explorer
  // =========================================================================
  console.log('🌱 [Seed 3/3] Creating / Updating Flexible Package Experience...')
  const flexPackageSlug = 'red-sea-desert-safari-4-days-flexible'
  const existingFlex = await payload.find({
    collection: 'experiences',
    where: { slug: { equals: flexPackageSlug } },
    limit: 1,
  })

  const flexPackageData = {
    title: 'Red Sea and Desert Safari - 4 Days Flexible Explorer',
    slug: flexPackageSlug,
    type: 'package' as const,
    packageMode: 'flexible_date' as const,
    city: hurghadaId,
    price: 16000,
    availability: 'available' as const,
    isActive: true,
    duration: {
      days: 4,
      nights: 3,
    },
    included: [
      { item: 'All-Inclusive 5-Star Red Sea Luxury Resort Stay (3 Nights)' },
      { item: 'Private Yacht Cruise to Giftun Island with Snorkeling Equipment' },
      { item: 'Sunset Quad Bike Desert Safari with Traditional Bedouin Dinner' },
      { item: 'VIP Hurghada Airport Round-Trip Transfers' },
    ],
    excluded: [
      { item: 'Scuba Diving Certification Courses' },
      { item: 'Resort Spa Treatments and Massage Services' },
      { item: 'Personal Shopping and Souvenirs' },
    ],
    itinerary: [
      {
        dayNumber: 1,
        title: 'VIP Airport Welcome and Resort Check-in',
        description:
          'Private transfer from Hurghada Airport to your 5-star beachfront luxury resort. Free afternoon to enjoy private beach and pools.',
      },
      {
        dayNumber: 2,
        title: 'Giftun Island VIP Snorkeling Boat Cruise',
        description:
          'Full-day private yacht voyage to Orange Bay / Giftun Island with guided snorkeling among vibrant coral reefs and seafood lunch.',
      },
      {
        dayNumber: 3,
        title: 'Desert Quad Safari, Camel Trek and Bedouin Stargazing',
        description:
          'Afternoon quad biking adventure into the Eastern Desert, traditional camel ride, Bedouin barbecue dinner, and guided stargazing.',
      },
      {
        dayNumber: 4,
        title: 'Morning Beach Relaxation and VIP Departure',
        description:
          'Leisurely morning swim, checkout at 12:00 PM local time, and private Mercedes transfer to Hurghada International Airport.',
      },
    ],
    description: toLexical(
      'Experience the perfect fusion of Red Sea coastal luxury and exhilarating desert adventures with our 4-day flexible package. Choose any arrival date of your preference.',
    ),
    policies: toLexical(
      'Flexible Date Policy: Customer selects arrival date at checkout. Checkout on final day is 12:00 PM local destination time. Free date adjustments up to 48 hours prior.',
    ),
    seo: {
      title: 'Red Sea 4 Days Flexible Package | Laube Voyage',
      description:
        'Book a 4-day luxury Red Sea resort and safari package with flexible start dates.',
      keywords: 'Hurghada Package, Red Sea Luxury, Desert Safari Egypt, Flexible Travel',
    },
  }

  let flexPackageId: number
  if (existingFlex.docs.length > 0) {
    const updated = await payload.update({
      collection: 'experiences',
      id: existingFlex.docs[0].id,
      data: flexPackageData,
    })
    flexPackageId = updated.id
    console.log(`✅ [Seed] Flexible Package updated (ID: #${flexPackageId})`)
  } else {
    const created = await payload.create({
      collection: 'experiences',
      data: flexPackageData,
    })
    flexPackageId = created.id
    console.log(`✅ [Seed] Flexible Package created (ID: #${flexPackageId})`)
  }

  console.log('\n=================================================================')
  console.log('🎉 [Seed] Real E2E Experiences successfully seeded and ready!')
  console.log('=================================================================')
  console.log(`1. Daily Tour:         http://localhost:3000/experiences/${dailyTourSlug}`)
  console.log(`2. Fixed Package:      http://localhost:3000/experiences/${fixedPackageSlug}`)
  console.log(`3. Flexible Package:   http://localhost:3000/experiences/${flexPackageSlug}`)
  console.log('=================================================================\n')

  process.exit(0)
}

seedRealE2EExperiences().catch((err) => {
  console.error('❌ [Seed] Error during seeding:', err)
  process.exit(1)
})
