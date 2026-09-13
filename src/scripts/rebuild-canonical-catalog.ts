import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

process.env.VITEST = 'true'

async function main() {
  console.log('====================================================')
  console.log('🚀 STARTING CANONICAL EXPERIENCES CATALOG REBUILD')
  console.log('====================================================\n')

  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const { CANONICAL_EXPERIENCES, seedCatalogExperiences } = await import('../seed/catalog/experiences.seed')
  const { seedDepartureSlots } = await import('../seed/catalog/departure-slots.seed')
  const { ExperienceDetailsLoader } = await import('../application/experience/loaders-details')

  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool
  const client = await pool.connect()

  try {
    // ----------------------------------------------------------------
    // PHASE 0: PREFLIGHT ASSERTIONS (STOP-ON-FAILURE)
    // ----------------------------------------------------------------
    console.log('▶ [PHASE 0] Executing Preflight Assertions...')

    // 0.1 Seed Array Integrity
    if (CANONICAL_EXPERIENCES.length !== 11) {
      throw new Error(`[Preflight] CANONICAL_EXPERIENCES length mismatch: Expected 11, got ${CANONICAL_EXPERIENCES.length}`)
    }

    const packageDefs = CANONICAL_EXPERIENCES.filter((e) => e.type === 'package')
    const dailyTourDefs = CANONICAL_EXPERIENCES.filter((e) => e.type === 'daily_tour')

    if (packageDefs.length !== 9) {
      throw new Error(`[Preflight] Package count mismatch: Expected 9, got ${packageDefs.length}`)
    }
    if (dailyTourDefs.length !== 2) {
      throw new Error(`[Preflight] Daily Tour count mismatch: Expected 2, got ${dailyTourDefs.length}`)
    }

    // 0.2 Daily Tours must have 0 accommodations
    dailyTourDefs.forEach((dt) => {
      if (dt.accommodations && dt.accommodations.length > 0) {
        throw new Error(`[Preflight] Daily Tour '${dt.slug}' must NOT contain accommodations. Found: ${dt.accommodations.length}`)
      }
    })

    // 0.3 Packages Stays & Room Rates Exact Count
    let totalCanonicalStays = 0
    let totalCanonicalRoomRates = 0

    packageDefs.forEach((pkg) => {
      if (!pkg.accommodations || pkg.accommodations.length === 0) {
        throw new Error(`[Preflight] Package '${pkg.slug}' has no accommodations defined.`)
      }
      totalCanonicalStays += pkg.accommodations.length
      pkg.accommodations.forEach((stay, stayIdx) => {
        if (!stay.pricingUnit || (stay.pricingUnit !== 'per_stay' && stay.pricingUnit !== 'per_night')) {
          throw new Error(`[Preflight] Package '${pkg.slug}' Stay #${stayIdx + 1} is missing valid pricingUnit.`)
        }
        if (!stay.roomRates || stay.roomRates.length !== 4) {
          throw new Error(`[Preflight] Package '${pkg.slug}' Stay #${stayIdx + 1} must contain exactly 4 room rates. Found: ${stay.roomRates?.length}`)
        }

        const occupancies = stay.roomRates.map((r) => r.occupancy)
        const uniqueOccs = new Set(occupancies)
        if (uniqueOccs.size !== 4) {
          throw new Error(`[Preflight] Package '${pkg.slug}' Stay #${stayIdx + 1} has duplicate room occupancies: ${occupancies.join(', ')}`)
        }

        const doubleRate = stay.roomRates.find((r) => r.occupancy === 'double')
        const singleRate = stay.roomRates.find((r) => r.occupancy === 'single')
        const tripleRate = stay.roomRates.find((r) => r.occupancy === 'triple')
        const quadRate = stay.roomRates.find((r) => r.occupancy === 'quad')

        if (!doubleRate || doubleRate.enabled !== true || typeof doubleRate.rateEGP !== 'number' || doubleRate.rateEGP <= 0) {
          throw new Error(`[Preflight] Invalid double rate in '${pkg.slug}' Stay #${stayIdx + 1}`)
        }
        if (!singleRate || singleRate.enabled !== true || typeof singleRate.rateEGP !== 'number' || singleRate.rateEGP <= 0) {
          throw new Error(`[Preflight] Invalid single rate in '${pkg.slug}' Stay #${stayIdx + 1}`)
        }
        if (!tripleRate || tripleRate.enabled !== true || typeof tripleRate.rateEGP !== 'number' || tripleRate.rateEGP <= 0) {
          throw new Error(`[Preflight] Invalid triple rate in '${pkg.slug}' Stay #${stayIdx + 1}`)
        }
        if (!quadRate || quadRate.enabled !== false || quadRate.rateEGP !== 0) {
          throw new Error(`[Preflight] Invalid quad rate in '${pkg.slug}' Stay #${stayIdx + 1}. Expected enabled=false, rateEGP=0`)
        }

        totalCanonicalRoomRates += stay.roomRates.length
      })
    })

    if (totalCanonicalStays !== 22) {
      throw new Error(`[Preflight] Canonical Stays count mismatch: Expected 22, got ${totalCanonicalStays}`)
    }
    if (totalCanonicalRoomRates !== 88) {
      throw new Error(`[Preflight] Canonical Room Rates count mismatch: Expected 88, got ${totalCanonicalRoomRates}`)
    }

    // 0.4 Database Pre-state Assertions
    const bookingsCountRes = await client.query(`SELECT COUNT(*) as count FROM "bookings";`)
    if (Number(bookingsCountRes.rows[0].count) !== 0) {
      throw new Error(`[Preflight] Active bookings detected in database (${bookingsCountRes.rows[0].count}). Aborting catalog reseed to preserve operational safety!`)
    }

    const dbExpsRes = await client.query(`SELECT id, slug, type FROM "experiences" ORDER BY id ASC;`)
    if (dbExpsRes.rows.length !== 11) {
      throw new Error(`[Preflight] Database experiences count mismatch: Expected 11, got ${dbExpsRes.rows.length}`)
    }

    // Verify all 11 slugs exist and map 1-to-1
    for (const canonicalExp of CANONICAL_EXPERIENCES) {
      const match = dbExpsRes.rows.find((r: any) => r.slug === canonicalExp.slug)
      if (!match) {
        throw new Error(`[Preflight] Database is missing canonical experience slug: '${canonicalExp.slug}'`)
      }
      if (match.type !== canonicalExp.type) {
        throw new Error(`[Preflight] Experience type mismatch for '${canonicalExp.slug}': DB has '${match.type}', seed has '${canonicalExp.type}'`)
      }
    }

    console.log('✅ [PHASE 0] Preflight Assertions Passed (11 Experiences, 9 Packages, 2 Daily Tours, 22 Stays, 88 Room Rates, 0 Bookings).\n')

    // ----------------------------------------------------------------
    // PHASE 1: EXECUTE ISOLATED VERSIONED MIGRATION (DROP LEGACY TABLE)
    // ----------------------------------------------------------------
    console.log('▶ [PHASE 1] Executing Migration: Drop Legacy Occupancy Options Table...')
    await client.query(`DROP TABLE IF EXISTS "experiences_accommodations_occupancy_options" CASCADE;`)
    
    // Check if table still exists
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'experiences_accommodations_occupancy_options';
    `)
    if (tableCheck.rows.length > 0) {
      throw new Error(`[Phase 1] Failed to drop legacy table 'experiences_accommodations_occupancy_options'.`)
    }
    console.log('✅ [PHASE 1] Legacy table dropped successfully and verified absent from PostgreSQL schema.\n')

    // ----------------------------------------------------------------
    // PHASE 2: IN-PLACE CANONICAL EXPERIENCES & ACCOMMODATIONS RESEED
    // ----------------------------------------------------------------
    console.log('▶ [PHASE 2] Executing In-Place Canonical Experiences Reseed...')
    
    // Fetch dependencies required by seedCatalogExperiences
    const citiesRes = await payload.find({ collection: 'cities', limit: 100 })
    const cityDocsMap: Record<string, any> = {}
    citiesRes.docs.forEach((c) => { cityDocsMap[c.slug] = c })

    const accommodationsRes = await payload.find({ collection: 'accommodations', limit: 100 })
    const accommodationDocsMap: Record<string, any> = {}
    accommodationsRes.docs.forEach((a) => { accommodationDocsMap[a.slug] = a })

    const catalogResult = await seedCatalogExperiences(payload, cityDocsMap, accommodationDocsMap)
    console.log(`   Processed experiences: ${catalogResult.totalProcessed} (${catalogResult.totalUpdated} updated in-place, ${catalogResult.totalCreated} created).`)

    // Database-level assertions for Phase 2
    const dbStaysCountRes = await client.query(`SELECT COUNT(*) as count FROM "experiences_accommodations";`)
    const dbRoomRatesCountRes = await client.query(`SELECT COUNT(*) as count FROM "experiences_accommodations_room_rates";`)

    const actualStaysCount = Number(dbStaysCountRes.rows[0].count)
    const actualRoomRatesCount = Number(dbRoomRatesCountRes.rows[0].count)

    console.log(`   PostgreSQL DB State:`)
    console.log(`     - Stays Rows in DB: ${actualStaysCount} (Expected: 22)`)
    console.log(`     - Room Rates Rows in DB: ${actualRoomRatesCount} (Expected: 88)`)

    if (actualStaysCount !== 22) {
      throw new Error(`[Phase 2 Failure] Database stays count (${actualStaysCount}) !== 22`)
    }
    if (actualRoomRatesCount !== 88) {
      throw new Error(`[Phase 2 Failure] Database room rates count (${actualRoomRatesCount}) !== 88`)
    }

    // Verify room rate distributions at SQL level
    const occDistRes = await client.query(`
      SELECT occupancy, enabled, COUNT(*) as count 
      FROM "experiences_accommodations_room_rates" 
      GROUP BY occupancy, enabled 
      ORDER BY occupancy ASC;
    `)
    console.log('   Room Rates SQL Distribution:')
    console.table(occDistRes.rows)

    // Check each occupancy has exactly 22
    const doubleCount = occDistRes.rows.find((r: any) => r.occupancy === 'double' && r.enabled === true)?.count
    const singleCount = occDistRes.rows.find((r: any) => r.occupancy === 'single' && r.enabled === true)?.count
    const tripleCount = occDistRes.rows.find((r: any) => r.occupancy === 'triple' && r.enabled === true)?.count
    const quadCount = occDistRes.rows.find((r: any) => r.occupancy === 'quad' && r.enabled === false)?.count

    if (Number(doubleCount) !== 22 || Number(singleCount) !== 22 || Number(tripleCount) !== 22 || Number(quadCount) !== 22) {
      throw new Error(`[Phase 2 Failure] Room rate occupancy distribution mismatch: Double=${doubleCount}, Single=${singleCount}, Triple=${tripleCount}, Quad=${quadCount}`)
    }

    console.log('✅ [PHASE 2] Experiences & Accommodations Reseeded and Verified at Database Level.\n')

    // ----------------------------------------------------------------
    // PHASE 3: DEPARTURE SLOTS SYNCHRONIZATION & IDEMPOTENCY CHECK
    // ----------------------------------------------------------------
    console.log('▶ [PHASE 3] Executing Departure Slots Seeding and Idempotency Check...')
    
    // First run
    const slotsPass1 = await seedDepartureSlots(payload, catalogResult.experienceDocsMap)
    const dbSlotsCount1Res = await client.query(`SELECT COUNT(*) as count FROM "departure_slots";`)
    const slotsCount1 = Number(dbSlotsCount1Res.rows[0].count)
    console.log(`   Pass 1: Created/Processed ${slotsPass1.totalProcessed} slots. DB Total = ${slotsCount1}`)

    if (slotsCount1 !== 86) {
      throw new Error(`[Phase 3 Failure] Departure slots count after Pass 1 (${slotsCount1}) !== 86`)
    }

    // Second run (Idempotency verification)
    console.log('   Running Pass 2 (Idempotency Assert)...')
    const slotsPass2 = await seedDepartureSlots(payload, catalogResult.experienceDocsMap)
    const dbSlotsCount2Res = await client.query(`SELECT COUNT(*) as count FROM "departure_slots";`)
    const slotsCount2 = Number(dbSlotsCount2Res.rows[0].count)
    console.log(`   Pass 2: Processed ${slotsPass2.totalProcessed} slots. DB Total = ${slotsCount2}`)

    if (slotsCount2 !== 86) {
      throw new Error(`[Phase 3 Failure] Idempotency violation: Departure slots count increased from 86 to ${slotsCount2}`)
    }

    console.log('✅ [PHASE 3] Departure Slots Synchronized & Idempotency Verified (Exactly 86 slots on both runs).\n')

    // ----------------------------------------------------------------
    // PHASE 4: MULTI-SLUG RUNTIME VERIFICATION ACROSS ALL 11 EXPERIENCES
    // ----------------------------------------------------------------
    console.log('▶ [PHASE 4] Executing Runtime Verification Across ALL 11 Slugs...')
    for (let i = 0; i < CANONICAL_EXPERIENCES.length; i++) {
      const expDef = CANONICAL_EXPERIENCES[i]
      const details = await ExperienceDetailsLoader.loadBySlug(expDef.slug, {
        locale: 'en',
        currency: 'EGP',
      })

      if (!details) {
        throw new Error(`[Phase 4 Failure] Failed to load experience details for slug: '${expDef.slug}'`)
      }

      if (details.type === 'daily_tour') {
        if (details.accommodations && details.accommodations.length > 0) {
          throw new Error(`[Phase 4 Failure] Daily Tour '${expDef.slug}' returned non-empty accommodations.`)
        }
        console.log(`   [${i + 1}/11] ✅ Daily Tour '${expDef.slug}' loaded cleanly (0 Stays, Base: ${details.pricing?.unitPrice?.amount || details.price} EGP).`)
      } else {
        if (!details.accommodations || details.accommodations.length === 0) {
          throw new Error(`[Phase 4 Failure] Package '${expDef.slug}' returned 0 accommodations.`)
        }
        const expectedStays = expDef.accommodations?.length || 0
        if (details.accommodations.length !== expectedStays) {
          throw new Error(`[Phase 4 Failure] Package '${expDef.slug}' stays count (${details.accommodations.length}) !== ${expectedStays}`)
        }

        // Verify every stay has room rates
        details.accommodations.forEach((stay, sIdx) => {
          if (!stay.roomRates || stay.roomRates.length !== 4) {
            throw new Error(`[Phase 4 Failure] Stay #${sIdx + 1} of '${expDef.slug}' has ${stay.roomRates?.length} room rates instead of 4.`)
          }
        })
        console.log(`   [${i + 1}/11] ✅ Package '${expDef.slug}' loaded cleanly (${details.accommodations.length} Stays, Stays PricingUnit: '${details.accommodations[0].pricingUnit}').`)
      }
    }

    console.log('\n====================================================')
    console.log('🏆 CANONICAL REBUILD & VERIFICATION COMPLETED 100% SUCCESSFULLY!')
    console.log('====================================================')

  } finally {
    client.release()
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ REBUILD FAILED WITH ERROR:', err)
  process.exit(1)
})
