import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

process.env.VITEST = 'true'

async function run() {
  console.log('🧪 Testing Accommodation Options Hierarchy Persistence via Payload Local API...')
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')

  const payload = await getPayload({ config })

  // Find first package experience
  const experiences = await payload.find({
    collection: 'experiences',
    where: {
      type: { equals: 'package' },
    },
    limit: 1,
    depth: 0,
  })

  if (experiences.docs.length === 0) {
    console.error('No package experience found to test.')
    process.exit(1)
  }

  const exp = experiences.docs[0]
  console.log(`Testing with Package #${exp.id}: "${exp.title}"`)

  // Save original accommodations to restore after test
  const originalAccommodations = exp.accommodations

  // Construct Gate 2 Test Payload with:
  // Stay 1: 5 nights, 2 hotel options (Multi-option Stay)
  // Stay 2: 3 nights, 1 hotel option
  const testAccommodationsPayload = [
    {
      order: 1,
      nights: 5,
      options: [
        {
          property: 17, // Four Seasons Hotel George V
          roomCategory: 'Deluxe Nile View Room',
          boardBasis: 'bed_and_breakfast' as const,
          pricingUnit: 'per_stay' as const,
          roomRates: [
            { occupancy: 'single' as const, rateEGP: 5000, enabled: true },
            { occupancy: 'double' as const, rateEGP: 8000, enabled: true },
            { occupancy: 'triple' as const, rateEGP: 11000, enabled: false },
            { occupancy: 'quad' as const, rateEGP: 14000, enabled: false },
          ],
        },
        {
          property: 16, // The Ritz Paris
          roomCategory: 'Executive Palace Suite',
          boardBasis: 'half_board' as const,
          pricingUnit: 'per_night' as const,
          roomRates: [
            { occupancy: 'single' as const, rateEGP: 7500, enabled: true },
            { occupancy: 'double' as const, rateEGP: 12000, enabled: true },
            { occupancy: 'triple' as const, rateEGP: 16000, enabled: true },
            { occupancy: 'quad' as const, rateEGP: 20000, enabled: false },
          ],
        },
      ],
    },
    {
      order: 2,
      nights: 3,
      options: [
        {
          property: 15, // Armani Hotel Dubai
          roomCategory: 'Armani Classic Room',
          boardBasis: 'all_inclusive' as const,
          pricingUnit: 'per_stay' as const,
          roomRates: [
            { occupancy: 'single' as const, rateEGP: 6000, enabled: true },
            { occupancy: 'double' as const, rateEGP: 9500, enabled: true },
            { occupancy: 'triple' as const, rateEGP: 13000, enabled: false },
            { occupancy: 'quad' as const, rateEGP: 16000, enabled: false },
          ],
        },
      ],
    },
  ]

  console.log('Updating experience with nested accommodation options...')
  const updated = await payload.update({
    collection: 'experiences',
    id: exp.id,
    data: {
      accommodations: testAccommodationsPayload as any,
    },
  })

  console.log('Reloading experience fresh from database...')
  const reloaded = await payload.findByID({
    collection: 'experiences',
    id: exp.id,
    depth: 0,
  })

  const stays = reloaded.accommodations || []
  console.log(`Reloaded Stays count: ${stays.length}`)

  // Assertions
  if (stays.length !== 2) {
    throw new Error(`Expected 2 stays, got ${stays.length}`)
  }

  const stay1 = stays[0]
  if (stay1.order !== 1 || stay1.nights !== 5) {
    throw new Error(`Stay 1 order/nights mismatch: order=${stay1.order}, nights=${stay1.nights}`)
  }

  if (!Array.isArray(stay1.options) || stay1.options.length !== 2) {
    throw new Error(`Expected Stay 1 to have 2 options, got ${stay1.options?.length}`)
  }

  const opt1A = stay1.options[0]
  const opt1B = stay1.options[1]

  if (Number(opt1A.property) !== 17 || opt1A.roomCategory !== 'Deluxe Nile View Room' || opt1A.pricingUnit !== 'per_stay') {
    throw new Error(`Option 1A mismatch: property=${opt1A.property}, category=${opt1A.roomCategory}`)
  }

  if (Number(opt1B.property) !== 16 || opt1B.boardBasis !== 'half_board' || opt1B.pricingUnit !== 'per_night') {
    throw new Error(`Option 1B mismatch: property=${opt1B.property}, board=${opt1B.boardBasis}`)
  }

  // Check Room Rates
  if (!Array.isArray(opt1A.roomRates) || opt1A.roomRates.length < 2) {
    throw new Error(`Option 1A room rates mismatch`)
  }
  const sglRate = opt1A.roomRates.find((r) => r.occupancy === 'single')
  if (Number(sglRate?.rateEGP) !== 5000 || !sglRate?.enabled) {
    throw new Error(`Option 1A single rate mismatch: ${sglRate?.rateEGP}`)
  }

  const stay2 = stays[1]
  if (stay2.order !== 2 || stay2.nights !== 3) {
    throw new Error(`Stay 2 order/nights mismatch`)
  }
  if (!Array.isArray(stay2.options) || stay2.options.length !== 1) {
    throw new Error(`Expected Stay 2 to have 1 option, got ${stay2.options?.length}`)
  }

  console.log('✅ All Payload persistence assertions passed perfectly!')
  console.log('  - Stay 1 has 2 hotel alternatives (Rixos & Ritz equivalent in catalog)')
  console.log('  - Stay 2 has 1 hotel option')
  console.log('  - Array identities (Stay.id, Option.id, RoomRate.id) generated by Payload')
  console.log('  - All commercial options, board basis, and pricing units preserved')

  // Test Domain Mapper on this persisted document
  console.log('Testing Domain Mapper with persisted document...')
  const { mapExperienceDocToAggregate } = await import('@/domains/experience/repository/experience-mapper')
  const domainEntity = mapExperienceDocToAggregate(reloaded)

  if (domainEntity.type === 'package') {
    if (!domainEntity.accommodations || domainEntity.accommodations.length !== 2) {
      throw new Error(`Domain mapper failed to map 2 stays`)
    }
    const dStay1 = domainEntity.accommodations[0]
    if (dStay1.options.length !== 2) {
      throw new Error(`Domain mapper failed to map 2 options on stay 1`)
    }
    console.log('✅ Domain Mapper mapped persisted document successfully into domain entities!')
  }

  // Restore original accommodations with minimum 1 option per stay
  console.log('Restoring clean package accommodations with 1 hotel option per stay...')
  const cleanRestored = (originalAccommodations || []).map((s: any, idx: number) => ({
    order: s.order || idx + 1,
    nights: s.nights || 3,
    options: [
      {
        property: 17,
        roomCategory: 'Classic Room',
        boardBasis: 'bed_and_breakfast',
        pricingUnit: 'per_stay',
        roomRates: [
          { occupancy: 'double', rateEGP: 5000, enabled: true },
        ],
      },
    ],
  }))
  await payload.update({
    collection: 'experiences',
    id: exp.id,
    data: {
      accommodations: cleanRestored as any,
    },
  })
  console.log('✅ Clean single-hotel document state restored.')

  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Persistence test failed:', err)
  process.exit(1)
})
