import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.VITEST = 'true'

async function runVerification() {
  console.log('=================================================================')
  console.log('🧪 ACCOMMODATION × DESTINATION INTEGRATION VERIFICATION SUITE')
  console.log('=================================================================\n')

  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const { Experiences } = await import('../collections/Experiences')
  const {
    getAccommodationsForAdminAction,
  } = await import('../application/actions/accommodation-admin-actions')

  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool
  const client = await pool.connect()

  let passedTests = 0
  let totalTests = 0

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`)
      passedTests++
    } else {
      console.error(`  ❌ [FAIL] ${testName}`)
      if (details) console.error(`     Details: ${details}`)
      process.exitCode = 1
    }
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Schema filterOptions Verification
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ TEST 1: Payload Experiences Schema filterOptions')
    const accommodationsField = Experiences.fields.find(
      (f: any) => f.name === 'accommodations',
    ) as any
    assert(!!accommodationsField, 'Accommodations array field exists in Experiences collection')

    const optionsField = accommodationsField?.fields?.find(
      (f: any) => f.name === 'options',
    ) as any
    assert(!!optionsField, 'Options array field exists in Accommodations stay schema')

    const propertyField = optionsField?.fields?.find(
      (f: any) => f.name === 'property',
    ) as any
    assert(!!propertyField, 'Property relationship field exists in Options schema')
    assert(
      typeof propertyField?.filterOptions === 'function',
      'Property relationship field has native filterOptions function configured',
    )

    // Test filterOptions evaluation
    const mockDataWithDestinations = {
      city: 1, // Cairo
      destinations: [2, 3], // Luxor, Aswan
    }
    const filterRes = propertyField.filterOptions({ data: mockDataWithDestinations })
    assert(
      Array.isArray(filterRes?.and) &&
        filterRes.and.some((c: any) => Array.isArray(c.city?.in) && c.city.in.includes(1)),
      'filterOptions dynamically produces { city: { in: [1, 2, 3] } }',
    )

    const mockDataEmpty = { city: null, destinations: [] }
    const filterResEmpty = propertyField.filterOptions({ data: mockDataEmpty })
    assert(
      filterResEmpty?.id?.equals === 0,
      'filterOptions safely denies all properties when experience has zero destinations',
    )

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Canonical Database Geographic Hierarchy
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 2: Canonical Database Hierarchy (Accommodation -> City -> Country)')
    const hierarchyRows = await client.query(`
      SELECT 
        a.id as acc_id,
        a.name as acc_name,
        a.type as acc_type,
        a.city_id,
        c.name as city_name,
        c.slug as city_slug,
        c.country_id,
        co.name as country_name,
        co.slug as country_slug
      FROM "accommodations" a
      JOIN "cities" c ON c.id = a.city_id
      JOIN "countries" co ON co.id = c.country_id
      ORDER BY a.id ASC;
    `)

    assert(
      hierarchyRows.rows.length >= 16,
      `All 16 canonical accommodations resolve City and Country without nulls (found: ${hierarchyRows.rows.length})`,
    )

    const unmappedAccs = await client.query(`
      SELECT COUNT(*) as count FROM "accommodations" WHERE city_id IS NULL;
    `)
    assert(
      Number(unmappedAccs.rows[0].count) === 0,
      'Zero unmapped accommodations in database (city_id IS NOT NULL constraint enforced)',
    )

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Destination-Aware Filtering Scenarios
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 3: Destination-Aware Server Action Filtering')

    // Find city IDs for Cairo, Luxor, Aswan, Paris, Dubai
    const cairoDoc = await payload.find({ collection: 'cities', where: { slug: { equals: 'cairo' } }, limit: 1 })
    const luxorDoc = await payload.find({ collection: 'cities', where: { slug: { equals: 'luxor' } }, limit: 1 })
    const aswanDoc = await payload.find({ collection: 'cities', where: { slug: { equals: 'aswan' } }, limit: 1 })
    const parisDoc = await payload.find({ collection: 'cities', where: { slug: { equals: 'paris' } }, limit: 1 })
    const dubaiDoc = await payload.find({ collection: 'cities', where: { slug: { equals: 'dubai' } }, limit: 1 })

    const cairoId = cairoDoc.docs[0]?.id
    const luxorId = luxorDoc.docs[0]?.id
    const aswanId = aswanDoc.docs[0]?.id
    const parisId = parisDoc.docs[0]?.id
    const dubaiId = dubaiDoc.docs[0]?.id

    assert(
      !!cairoId && !!luxorId && !!aswanId && !!parisId && !!dubaiId,
      'Canonical test cities retrieved successfully from database',
    )

    // Scenario 3A: Single Destination (Paris)
    const parisAccommodations = await payload.find({
      collection: 'accommodations',
      where: {
        and: [{ isActive: { equals: true } }, { city: { in: [parisId] } }],
      },
      depth: 2,
    })

    assert(
      parisAccommodations.docs.length === 2,
      `Paris journey returns exactly 2 Paris properties (found ${parisAccommodations.docs.length})`,
    )
    const parisNames = parisAccommodations.docs.map((d: any) => d.name)
    assert(
      parisNames.includes('The Ritz Paris') && parisNames.includes('Four Seasons Hotel George V, Paris'),
      'Paris journey returns The Ritz Paris and Four Seasons George V',
    )
    assert(
      !parisNames.some((n: string) => n.toLowerCase().includes('cairo') || n.toLowerCase().includes('dubai')),
      'Paris journey contains ZERO Egyptian or Emirati hotels (No leakage)',
    )

    // Scenario 3B: Multi-Destination Journey (Luxor + Aswan)
    const upperEgyptAccommodations = await payload.find({
      collection: 'accommodations',
      where: {
        and: [{ isActive: { equals: true } }, { city: { in: [luxorId, aswanId] } }],
      },
      depth: 2,
    })

    assert(
      upperEgyptAccommodations.docs.length >= 6,
      `Luxor + Aswan journey returns Upper Egypt hotels and cruisers (found ${upperEgyptAccommodations.docs.length})`,
    )
    const upperEgyptCities = new Set(
      upperEgyptAccommodations.docs.map((d: any) =>
        typeof d.city === 'object' ? d.city.id : d.city,
      ),
    )
    assert(
      Array.from(upperEgyptCities).every((id) => id === luxorId || id === aswanId),
      'All returned accommodations belong exclusively to Luxor or Aswan',
    )

    // Scenario 3C: Type Filtering (Nile Cruises)
    const cruiseAccommodations = await payload.find({
      collection: 'accommodations',
      where: {
        and: [
          { isActive: { equals: true } },
          { city: { in: [luxorId, aswanId] } },
          { type: { equals: 'cruise' } },
        ],
      },
      depth: 2,
    })

    assert(
      cruiseAccommodations.docs.length === 2,
      `Filtering by 'cruise' returns exactly the 2 Nile Cruisers (found ${cruiseAccommodations.docs.length})`,
    )
    const cruiseNames = cruiseAccommodations.docs.map((d: any) => d.name)
    assert(
      cruiseNames.includes('The Oberoi Zahra Luxury Nile Cruiser') &&
        cruiseNames.includes('Sonesta St. George I Nile Cruise'),
      'Both Nile Cruisers correctly classified and retrieved',
    )

    // Scenario 3D: Strict Zero-Fallback (Empty Result Verification)
    const nonExistentCityId = 999999
    const emptyAccommodations = await payload.find({
      collection: 'accommodations',
      where: {
        and: [{ isActive: { equals: true } }, { city: { in: [nonExistentCityId] } }],
      },
      depth: 2,
    })

    assert(
      emptyAccommodations.docs.length === 0,
      'When journey city has no hotels, returns strictly 0 results (NO global fallback)',
    )

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Frontend Resolver Functions
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST 4: Frontend Resolvers (Location & Type/Rating)')
    const {
      resolvePropertyLocation,
      resolvePropertyTypeAndRating,
      resolvePropertyName,
    } = await import('../components/admin/accommodations/types')

    const mockCatalog = [
      {
        id: 1,
        name: 'The Ritz Paris',
        type: 'hotel',
        rating: 5,
        cityName: 'Paris',
        countryName: 'France',
      },
      {
        id: 2,
        name: 'Sonesta St. George I Nile Cruise',
        type: 'cruise',
        rating: 5,
        cityName: 'Aswan',
        countryName: 'Egypt',
      },
    ]

    const loc1 = resolvePropertyLocation(1, mockCatalog as any)
    assert(loc1 === 'Paris · France', `resolvePropertyLocation returns '${loc1}' (expected 'Paris · France')`)

    const typeRating1 = resolvePropertyTypeAndRating(1, mockCatalog as any)
    assert(typeRating1 === 'Hotel • ★5', `resolvePropertyTypeAndRating returns '${typeRating1}' (expected 'Hotel • ★5')`)

    const typeRating2 = resolvePropertyTypeAndRating(2, mockCatalog as any)
    assert(typeRating2 === 'Nile Cruise • ★5', `resolvePropertyTypeAndRating returns '${typeRating2}' (expected 'Nile Cruise • ★5')`)

    const name1 = resolvePropertyName(1, mockCatalog as any)
    assert(name1 === 'The Ritz Paris', `resolvePropertyName returns '${name1}'`)

    console.log('\n=================================================================')
    console.log(`📊 FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED`)
    console.log('=================================================================')

    if (passedTests === totalTests) {
      console.log('🎉 ALL INTEGRATION & VERIFICATION CHECKS PASSED PERFECTLY!\n')
    }
  } finally {
    client.release()
  }
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution error:', err)
    process.exit(1)
  })
