import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.VITEST = 'true'

import { mapExperienceDocToAggregate } from '../src/domains/experience/repository/experience-mapper'
import { ExperienceDetailsLoader } from '../src/application/experience/loaders-details'

async function testHierarchyIntegrity() {
  console.log('====================================================================')
  console.log('🔍 PROVING ACCOMMODATION HIERARCHY: 1 STAY WITH 3 OPTIONS (ALTERNATIVES)')
  console.log('====================================================================\n')

  // Construct a mock / raw Payload doc representing:
  // 1 Stay (Order 1, Nights 5)
  // containing 3 Options (Hotel A, Hotel B, Hotel C)
  const mockDoc: any = {
    id: 9999,
    title: 'Multi-Option Single Stay Test Experience',
    slug: 'multi-option-single-stay-test',
    type: 'package',
    packageMode: 'fixed_date',
    availability: 'available',
    city: { id: 1, name: 'Paris', slug: 'paris' },
    duration: { days: 6, nights: 5 },
    price: 100000,
    accommodations: [
      {
        id: 'stay-uuid-001',
        order: 1,
        nights: 5,
        options: [
          {
            id: 'opt-uuid-A',
            property: { id: 17, name: 'Four Seasons Hotel George V, Paris', slug: 'four-seasons-paris', type: 'hotel' },
            roomCategory: 'Deluxe Room',
            boardBasis: 'bed_and_breakfast',
            pricingUnit: 'per_stay',
            roomRates: [
              { occupancy: 'double', rateEGP: 50000, enabled: true },
              { occupancy: 'single', rateEGP: 40000, enabled: true },
            ],
          },
          {
            id: 'opt-uuid-B',
            property: { id: 16, name: 'The Ritz Paris', slug: 'the-ritz-paris', type: 'hotel' },
            roomCategory: 'Executive Suite',
            boardBasis: 'bed_and_breakfast',
            pricingUnit: 'per_stay',
            roomRates: [
              { occupancy: 'double', rateEGP: 60000, enabled: true },
              { occupancy: 'single', rateEGP: 50000, enabled: true },
            ],
          },
          {
            id: 'opt-uuid-C',
            property: { id: 15, name: 'Armani Hotel Dubai', slug: 'armani-hotel-dubai', type: 'hotel' },
            roomCategory: 'Classic Room',
            boardBasis: 'bed_and_breakfast',
            pricingUnit: 'per_stay',
            roomRates: [
              { occupancy: 'double', rateEGP: 45000, enabled: true },
              { occupancy: 'single', rateEGP: 35000, enabled: true },
            ],
          },
        ],
      },
    ],
  }

  // 1. Test Domain Aggregate Mapper
  console.log('--- 1. DOMAIN REPOSITORY / MAPPER LAYER ---')
  const aggregate = mapExperienceDocToAggregate(mockDoc)
  console.log(`Aggregate accommodations count (Stays): ${aggregate.accommodations?.length}`)
  const stay1 = aggregate.accommodations?.[0]
  console.log(`Stay #1 Order: ${stay1?.order}, Nights: ${stay1?.nights}`)
  console.log(`Stay #1 Options Count: ${stay1?.options.length}`)
  stay1?.options.forEach((opt, idx) => {
    console.log(`  Option #${idx + 1}: ID="${opt.id}", PropertyID=${opt.propertyId}, PropertyName="${opt.property?.name}"`)
  })

  // Verify assertion on Aggregate
  if (aggregate.accommodations?.length !== 1) {
    throw new Error(`CRITICAL: Aggregate flattened 1 Stay into ${aggregate.accommodations?.length} Stays!`)
  }
  if (stay1?.options.length !== 3) {
    throw new Error(`CRITICAL: Aggregate did not retain 3 options in Stay 1! Found: ${stay1?.options.length}`)
  }
  console.log('✅ DOMAIN AGGREGATE LAYER: 1 Stay strictly contains 3 Options (NO FLATTENING).\n')

  console.log('====================================================================')
  console.log('TABLE OF LAYER PERSISTENCE:')
  console.log('Layer      | Stay Order | Option ID   | Property Name')
  console.log('--------------------------------------------------------------------')
  stay1?.options.forEach((opt) => {
    console.log(`Repository | 1          | ${opt.id}  | ${opt.property?.name}`)
  })
  console.log('====================================================================\n')
}

testHierarchyIntegrity().catch((err) => {
  console.error(err)
  process.exit(1)
})
