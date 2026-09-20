/**
 * ACCOMMODATION FINAL E2E INTEGRITY PROOF
 * Comprehensive Single-Run End-to-End Forensic Verification
 * 
 * Trace:
 * Admin Authoring -> Domain -> Customer Selection -> Pricing Engine ->
 * URL Transport -> Checkout -> Booking Creation -> PostgreSQL JSONB ->
 * Customer Booking Dossier -> Historical Immutability Counter-Proof
 */

import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.VITEST = 'true'

function normalizeAccommodationsForPayload(accommodations: any[]) {
  if (!Array.isArray(accommodations)) return []
  return accommodations.map((stay) => ({
    order: stay.order,
    nights: stay.nights,
    options: (stay.options || []).map((opt: any) => ({
      property: typeof opt.property === 'object' && opt.property !== null ? opt.property.id : opt.property,
      roomCategory: opt.roomCategory,
      boardBasis: opt.boardBasis,
      pricingUnit: opt.pricingUnit,
      roomRates: (opt.roomRates || []).map((rr: any) => ({
        occupancy: rr.occupancy,
        rateEGP: rr.rateEGP,
        enabled: rr.enabled !== false,
      })),
    })),
  }))
}

async function runVerification() {
  console.log('================================================================================')
  console.log('🏛️  ACCOMMODATION FINAL E2E INTEGRITY PROOF — FORENSIC VERIFICATION')
  console.log('================================================================================\n')

  const { getApplicationServices } = await import('../application/factory')
  const { AccommodationParamsParser } = await import('../application/shared/parsers/accommodation-params-parser')
  const { CheckoutPageLoader } = await import('../application/booking/loaders-checkout')
  const { BookingDetailsLoader } = await import('../application/dashboard/loaders')
  const { SessionResolver } = await import('../application/auth/session-resolver')

  const originalSessionResolve = SessionResolver.resolve
  SessionResolver.resolve = (async () => ({
    isAuthenticated: true,
    role: 'customer' as const,
    customerId: 901,
    email: 'hamza@example.com',
    firstName: 'hamza',
    lastName: 'bahaa',
  })) as any

  const { booking, bookingPricingUseCase, experience, localization, payload } = await getApplicationServices()
  const pool = (payload.db as any).pool

  let originalBackup: any = null
  let createdBookingId: number | null = null
  let createdBookingNumber: string | null = null
  let testPassed = false

  try {
    // -------------------------------------------------------------------------
    // PHASE 0: RECONNAISSANCE & BACKUP
    // -------------------------------------------------------------------------
    console.log('--- PHASE 0: RECONNAISSANCE & BACKUP ---')
    const expDoc = await payload.findByID({
      collection: 'experiences',
      id: 1955,
      depth: 2,
    })

    if (!expDoc) {
      throw new Error('Experience #1955 not found in database.')
    }
    console.log(`[Reconnaissance] Package #1955: "${expDoc.title}"`)
    console.log(`[Reconnaissance] Current accommodations length: ${expDoc.accommodations?.length || 0}`)
    console.log(`[Reconnaissance] Package updatedAt: ${expDoc.updatedAt}`)

    // Create deep copy backup
    originalBackup = normalizeAccommodationsForPayload(expDoc.accommodations || [])
    console.log(`[Safety Backup] Saved deep copy of original accommodations (${originalBackup.length} stays).`)

    // Verify properties 14, 15, 16, 17 exist
    const requiredPropertyIds = [17, 16, 15, 14]
    for (const propId of requiredPropertyIds) {
      const propDoc = await payload.findByID({
        collection: 'accommodations',
        id: propId,
        depth: 0,
      })
      if (!propDoc) {
        throw new Error(`Required property #${propId} not found in accommodations collection.`)
      }
      console.log(`[Property Verified] #${propId}: "${propDoc.name}"`)
    }

    // Verify Departure Slot
    const departureSlots = await payload.find({
      collection: 'departure-slots',
      where: { experience: { equals: 1955 } },
      limit: 1,
    })
    const slot = departureSlots.docs[0]
    if (!slot) {
      throw new Error('No departure slot found for Experience #1955.')
    }
    console.log(`[Slot Verified] Slot #${slot.id} on date ${slot.date}, available: ${slot.capacityAvailable}`)
    if (slot.capacityAvailable < 2 || (slot.capacityReserved ?? 0) >= (slot.capacityTotal ?? 10)) {
      await payload.update({
        collection: 'departure-slots',
        id: slot.id,
        data: {
          capacityTotal: 20,
          capacityReserved: 0,
          capacityAvailable: 20,
        },
      })
      slot.capacityTotal = 20
      slot.capacityReserved = 0
      slot.capacityAvailable = 20
      console.log(`[Slot Capacity Replenished] Reset total=20, reserved=0, available=20 for test execution.`)
    }

    // Verify Customer #901
    const testUserId = 901
    const customerDoc = await payload.findByID({
      collection: 'customers',
      id: testUserId,
      depth: 0,
    })
    if (!customerDoc) {
      throw new Error(`Test customer #${testUserId} not found in database.`)
    }
    console.log(`[Customer Verified] #${testUserId}: "${customerDoc.firstName} ${customerDoc.lastName}"`)

    // -------------------------------------------------------------------------
    // PHASE 1: ADMIN AUTHORING & NESTED PERSISTENCE
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 1: ADMIN AUTHORING & NESTED PERSISTENCE ---')
    console.log('Configuring Package #1955 with 2 stays and 2 options per stay:')
    console.log('  Stay 1 (5 nights): Option A [Property 17] vs Option B [Property 16]')
    console.log('  Stay 2 (3 nights): Option C [Property 15] vs Option D [Property 14]')

    const testAccommodationsPayload = [
      {
        order: 1,
        nights: 5,
        options: [
          {
            property: 17, // Four Seasons Hotel George V, Paris
            roomCategory: 'Deluxe Room',
            boardBasis: 'bed_and_breakfast' as const,
            pricingUnit: 'per_stay' as const,
            roomRates: [
              { occupancy: 'single' as const, rateEGP: 5000, enabled: true },
              { occupancy: 'double' as const, rateEGP: 8000, enabled: true },
            ],
          },
          {
            property: 16, // The Ritz Paris
            roomCategory: 'Executive Suite',
            boardBasis: 'half_board' as const,
            pricingUnit: 'per_night' as const,
            roomRates: [
              { occupancy: 'single' as const, rateEGP: 7500, enabled: true },
              { occupancy: 'double' as const, rateEGP: 12000, enabled: true },
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
            roomCategory: 'Classic Room',
            boardBasis: 'all_inclusive' as const,
            pricingUnit: 'per_stay' as const,
            roomRates: [
              { occupancy: 'single' as const, rateEGP: 6000, enabled: true },
              { occupancy: 'double' as const, rateEGP: 9500, enabled: true },
            ],
          },
          {
            property: 14, // Al Maha Desert Resort, Dubai
            roomCategory: 'Bedouin Suite',
            boardBasis: 'full_board' as const,
            pricingUnit: 'per_night' as const,
            roomRates: [
              { occupancy: 'single' as const, rateEGP: 10000, enabled: true },
              { occupancy: 'double' as const, rateEGP: 15000, enabled: true },
            ],
          },
        ],
      },
    ]

    await payload.update({
      collection: 'experiences',
      id: 1955,
      data: {
        accommodations: testAccommodationsPayload as any,
      },
    })

    // Reload fresh from database
    const reloadedExp = await payload.findByID({
      collection: 'experiences',
      id: 1955,
      depth: 2,
    })

    if (!reloadedExp || !reloadedExp.accommodations || reloadedExp.accommodations.length !== 2) {
      throw new Error('Failed to persist 2 stays on Experience #1955.')
    }

    const reloadedStay1 = reloadedExp.accommodations[0]
    const reloadedStay2 = reloadedExp.accommodations[1]

    if (!reloadedStay1.options || reloadedStay1.options.length !== 2) {
      throw new Error(`Stay 1 options count mismatch: expected 2, got ${reloadedStay1.options?.length}`)
    }
    if (!reloadedStay2.options || reloadedStay2.options.length !== 2) {
      throw new Error(`Stay 2 options count mismatch: expected 2, got ${reloadedStay2.options?.length}`)
    }

    const optA_id = reloadedStay1.options[0].id
    const optB_id = reloadedStay1.options[1].id
    const optC_id = reloadedStay2.options[0].id
    const optD_id = reloadedStay2.options[1].id

    console.log(`✅ Admin Authoring Persisted:`)
    console.log(`   Stay 1 (5 nights):`)
    console.log(`     - Option A ID: "${optA_id}" -> Hotel: "${(reloadedStay1.options[0].property as any)?.name}"`)
    console.log(`     - Option B ID: "${optB_id}" -> Hotel: "${(reloadedStay1.options[1].property as any)?.name}"`)
    console.log(`   Stay 2 (3 nights):`)
    console.log(`     - Option C ID: "${optC_id}" -> Hotel: "${(reloadedStay2.options[0].property as any)?.name}"`)
    console.log(`     - Option D ID: "${optD_id}" -> Hotel: "${(reloadedStay2.options[1].property as any)?.name}"`)

    if (!optA_id || !optB_id || !optC_id || !optD_id) {
      throw new Error('One or more accommodation option IDs failed to generate.')
    }

    // -------------------------------------------------------------------------
    // PHASE 2: CUSTOMER SELECTION SPECIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 2: CUSTOMER SELECTION SPECIFICATION ---')
    const selectedAccommodationOptions: Record<number, string> = {
      1: optB_id,
      2: optD_id,
    }
    console.log('Customer selected options:', selectedAccommodationOptions)
    console.log(`  Stay 1 selected: Option B ("The Ritz Paris")`)
    console.log(`  Stay 2 selected: Option D ("Al Maha Desert Resort")`)

    // Verify selections belong to correct stays
    if (selectedAccommodationOptions[1] !== optB_id) throw new Error('Stay 1 selection mismatch')
    if (selectedAccommodationOptions[2] !== optD_id) throw new Error('Stay 2 selection mismatch')
    if (Object.values(selectedAccommodationOptions).includes(optA_id)) {
      throw new Error('Option A must not be selected')
    }
    if (Object.values(selectedAccommodationOptions).includes(optC_id)) {
      throw new Error('Option C must not be selected')
    }
    console.log('✅ Selection validated against domain contract.')

    // -------------------------------------------------------------------------
    // PHASE 3: PRICING ENGINE EXECUTION
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 3: PRICING ENGINE EXECUTION ---')
    const localeCtx = {
      language: 'en',
      currency: 'EGP',
      country: 'EG',
      timezone: 'Africa/Cairo',
      measurement: 'metric' as const,
      weekStart: 1,
    }

    const pricingResult = await bookingPricingUseCase.calculate({
      experienceId: 1955,
      slotId: slot.id,
      adultsCount: 2,
      childrenCount: 0,
      selectedAccommodationOptions,
      ctx: localeCtx,
    })

    const breakdown = pricingResult.commercialBreakdown
    if (!breakdown) {
      throw new Error('Pricing result is missing commercialBreakdown.')
    }
    if (!breakdown.staysBreakdown || breakdown.staysBreakdown.length !== 2) {
      throw new Error(`Expected exactly 2 stays in staysBreakdown, got ${breakdown.staysBreakdown?.length}`)
    }

    const pStay1 = breakdown.staysBreakdown[0]
    const pStay2 = breakdown.staysBreakdown[1]

    console.log(`Pricing Breakdown Stay 1:`)
    console.log(`  optionId: "${pStay1.optionId}"`)
    console.log(`  property: "${pStay1.propertyName}"`)
    console.log(`  nights: ${pStay1.nights}`)
    console.log(`  pricingUnit: "${pStay1.pricingUnit}"`)
    console.log(`  total: ${pStay1.stayAccommodationTotalEGP} EGP`)

    console.log(`Pricing Breakdown Stay 2:`)
    console.log(`  optionId: "${pStay2.optionId}"`)
    console.log(`  property: "${pStay2.propertyName}"`)
    console.log(`  nights: ${pStay2.nights}`)
    console.log(`  pricingUnit: "${pStay2.pricingUnit}"`)
    console.log(`  total: ${pStay2.stayAccommodationTotalEGP} EGP`)

    // Forensic price assertions
    if (pStay1.optionId !== optB_id) {
      throw new Error(`Stay 1 pricing evaluated wrong option! Expected ${optB_id}, got ${pStay1.optionId}`)
    }
    if (pStay1.stayAccommodationTotalEGP !== 60000) {
      throw new Error(`Stay 1 total mismatch: expected 60,000 EGP (12,000 x 5), got ${pStay1.stayAccommodationTotalEGP}`)
    }

    if (pStay2.optionId !== optD_id) {
      throw new Error(`Stay 2 pricing evaluated wrong option! Expected ${optD_id}, got ${pStay2.optionId}`)
    }
    if (pStay2.stayAccommodationTotalEGP !== 45000) {
      throw new Error(`Stay 2 total mismatch: expected 45,000 EGP (15,000 x 3), got ${pStay2.stayAccommodationTotalEGP}`)
    }

    const calculatedAccommodationTotal = pStay1.stayAccommodationTotalEGP + pStay2.stayAccommodationTotalEGP
    if (calculatedAccommodationTotal !== 105000) {
      throw new Error(`Accommodation subtotal mismatch: expected 105,000 EGP, got ${calculatedAccommodationTotal}`)
    }

    // Negative assertions: Unselected options must not appear
    for (const s of breakdown.staysBreakdown) {
      if (s.optionId === optA_id) throw new Error('Unselected Option A appeared in pricing breakdown!')
      if (s.optionId === optC_id) throw new Error('Unselected Option C appeared in pricing breakdown!')
    }

    // Room allocation check
    if (!breakdown.roomAllocation || breakdown.roomAllocation.length !== 1) {
      throw new Error(`Expected 1 room in roomAllocation, got ${breakdown.roomAllocation?.length}`)
    }
    const room = breakdown.roomAllocation[0]
    if (room.occupancy !== 'double' || room.adults !== 2) {
      throw new Error(`Room occupancy mismatch: expected double for 2 adults, got ${room.occupancy}`)
    }

    console.log(`✅ Pricing Engine successfully priced Option B + Option D: Total = ${calculatedAccommodationTotal} EGP`)
    console.log(`✅ Room Allocation verified: 1 Room, Double Occupancy, 2 Adults.`)

    // -------------------------------------------------------------------------
    // PHASE 4: URL TRANSPORT SERIALIZATION & INBOUND PARSING
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 4: URL TRANSPORT SERIALIZATION & INBOUND PARSING ---')
    // Outbound serialization as performed by ExperienceDetailsPage.tsx
    const pairs = Object.entries(selectedAccommodationOptions)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([order, id]) => `${order}:${id.trim()}`)
    const serializedQueryParam = pairs.join(',')
    console.log(`Serialized URL param: "accommodations=${serializedQueryParam}"`)
    const expectedSerialized = `1:${optB_id},2:${optD_id}`
    if (serializedQueryParam !== expectedSerialized) {
      throw new Error(`Serialized string mismatch: expected "${expectedSerialized}", got "${serializedQueryParam}"`)
    }

    // Inbound parsing via AccommodationParamsParser
    const parsedOptions = AccommodationParamsParser.parse(serializedQueryParam)
    console.log('Parsed via AccommodationParamsParser:', parsedOptions)
    if (!parsedOptions || parsedOptions[1] !== optB_id || parsedOptions[2] !== optD_id) {
      throw new Error('Inbound parser failed to reconstruct exact options map.')
    }
    console.log('✅ URL Transport round-trip verified identity continuity without loss.')

    // -------------------------------------------------------------------------
    // PHASE 5: CHECKOUT LOADER EXECUTION
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 5: CHECKOUT LOADER EXECUTION ---')
    const checkoutData = await CheckoutPageLoader.loadByBookingId('new', {
      experienceId: 1955,
      slotId: slot.id,
      adults: 2,
      children: 0,
      selectedAccommodationOptions: parsedOptions,
      locale: 'en',
      currency: 'EGP',
    })

    if (!checkoutData) {
      throw new Error('CheckoutPageLoader returned null.')
    }
    console.log(`Checkout Page Loaded for experience: "${checkoutData.experienceTitle}"`)
    console.log('Checkout selectedAccommodationOptions:', checkoutData.selectedAccommodationOptions)

    if (
      !checkoutData.selectedAccommodationOptions ||
      checkoutData.selectedAccommodationOptions[1] !== optB_id ||
      checkoutData.selectedAccommodationOptions[2] !== optD_id
    ) {
      throw new Error('CheckoutPageLoader failed to retain selectedAccommodationOptions.')
    }
    console.log('✅ Checkout Page Loader received and confirmed Option B and Option D.')

    // -------------------------------------------------------------------------
    // PHASE 6: PRODUCTION BOOKING CREATION & SNAPSHOT GENERATION
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 6: PRODUCTION BOOKING CREATION ---')
    const departure = await experience.resolveBookableDepartureBySlot(1955, slot.id)
    if (!departure) {
      throw new Error(`Failed to resolve bookable departure for slot #${slot.id}`)
    }

    const pricingSnapshot = pricingResult.snapshot
    if (!pricingSnapshot.commercialBreakdown) {
      throw new Error('authoritativePricingSnapshot is missing commercialBreakdown!')
    }

    createdBookingId = await booking.create({
      userId: testUserId,
      departure,
      travelers: [
        { firstName: 'Forensic', lastName: 'Auditor1', email: 'auditor1@example.com', phone: '+201001112233', type: 'adult' },
        { firstName: 'Forensic', lastName: 'Auditor2', type: 'adult' },
      ],
      endDate: '2026-10-15',
      currency: 'EGP',
      source: 'website',
      pricingSnapshot: pricingSnapshot as any,
    })

    console.log(`✅ Production Booking Created: ID #${createdBookingId}`)

    // -------------------------------------------------------------------------
    // PHASE 7: RAW POSTGRESQL PERSISTENCE DIRECT QUERY
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 7: RAW POSTGRESQL PERSISTENCE DIRECT QUERY ---')
    const client = await pool.connect()
    let rawRow: any = null
    try {
      const dbRes = await client.query(
        `SELECT id, booking_number, pricing_snapshot_commercial_breakdown FROM bookings WHERE id = $1;`,
        [createdBookingId]
      )
      rawRow = dbRes.rows[0]
    } finally {
      client.release()
    }

    if (!rawRow) {
      throw new Error(`Booking #${createdBookingId} not found in raw PostgreSQL table 'bookings'!`)
    }

    createdBookingNumber = rawRow.booking_number
    console.log(`[Raw DB] Booking Number: ${createdBookingNumber}`)
    const persistedBreakdown = rawRow.pricing_snapshot_commercial_breakdown
    console.log(`[Raw DB] pricing_snapshot_commercial_breakdown type: ${typeof persistedBreakdown}`)

    if (!persistedBreakdown) {
      throw new Error('FAILED: pricing_snapshot_commercial_breakdown is NULL in PostgreSQL database!')
    }

    const staysBreakdown = persistedBreakdown.staysBreakdown
    if (!Array.isArray(staysBreakdown) || staysBreakdown.length !== 2) {
      throw new Error(`FAILED: staysBreakdown length mismatch in DB: expected 2, got ${staysBreakdown?.length}`)
    }

    console.log('PostgreSQL Stored Stays Breakdown:')
    for (const s of staysBreakdown) {
      console.log(`  - Stay #${s.order}: optionId='${s.optionId}', property='${s.propertyName}', nights=${s.nights}, unit='${s.pricingUnit}', total=${s.stayAccommodationTotalEGP} EGP`)
    }

    // Direct assertions on PostgreSQL stored values
    if (staysBreakdown[0].optionId !== optB_id) throw new Error('DB Stay 1 optionId mismatch')
    if (staysBreakdown[0].propertyName !== 'The Ritz Paris') throw new Error('DB Stay 1 propertyName mismatch')
    if (staysBreakdown[0].stayAccommodationTotalEGP !== 60000) throw new Error('DB Stay 1 total mismatch')

    if (staysBreakdown[1].optionId !== optD_id) throw new Error('DB Stay 2 optionId mismatch')
    if (staysBreakdown[1].propertyName !== 'Al Maha, a Luxury Collection Desert Resort & Spa, Dubai') throw new Error('DB Stay 2 propertyName mismatch')
    if (staysBreakdown[1].stayAccommodationTotalEGP !== 45000) throw new Error('DB Stay 2 total mismatch')

    console.log('✅ PostgreSQL physically confirmed to store Option B and Option D in JSONB column.')

    // -------------------------------------------------------------------------
    // PHASE 8: CUSTOMER BOOKING DOSSIER LOADER & PRESENTATION
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 8: CUSTOMER BOOKING DOSSIER LOADER & PRESENTATION ---')
    const customerDossier = await BookingDetailsLoader.loadByNumber(createdBookingNumber, testUserId, {
      locale: 'en',
      currency: 'EGP',
    })

    if (!customerDossier) {
      throw new Error(`BookingDetailsLoader returned null for booking #${createdBookingNumber}`)
    }

    console.log(`Customer Dossier Loaded: Reference #${customerDossier.bookingNumber}`)
    console.log(`Customer Dossier Stays count: ${customerDossier.stays?.length}`)
    console.log(`Customer Dossier Room Allocation count: ${customerDossier.roomAllocation?.length}`)

    if (!customerDossier.stays || customerDossier.stays.length !== 2) {
      throw new Error(`Customer Dossier stays count mismatch: expected 2, got ${customerDossier.stays?.length}`)
    }

    const dStay1 = customerDossier.stays[0]
    const dStay2 = customerDossier.stays[1]

    console.log(`  Stay 1 in Dossier: "${dStay1.propertyName}", ${dStay1.nights} Nights, Category: "${dStay1.roomCategory}"`)
    console.log(`  Stay 2 in Dossier: "${dStay2.propertyName}", ${dStay2.nights} Nights, Category: "${dStay2.roomCategory}"`)

    if (dStay1.propertyName !== 'The Ritz Paris') {
      throw new Error(`Dossier Stay 1 property mismatch: expected "The Ritz Paris", got "${dStay1.propertyName}"`)
    }
    if (dStay1.nights !== 5) throw new Error(`Dossier Stay 1 nights mismatch: expected 5, got ${dStay1.nights}`)

    if (dStay2.propertyName !== 'Al Maha, a Luxury Collection Desert Resort & Spa, Dubai') {
      throw new Error(`Dossier Stay 2 property mismatch: expected "Al Maha...", got "${dStay2.propertyName}"`)
    }
    if (dStay2.nights !== 3) throw new Error(`Dossier Stay 2 nights mismatch: expected 3, got ${dStay2.nights}`)

    console.log('✅ Customer Booking Dossier accurately presents Option B & Option D.')

    // -------------------------------------------------------------------------
    // PHASE 9: HISTORICAL IMMUTABILITY COUNTER-PROOF
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 9: HISTORICAL IMMUTABILITY COUNTER-PROOF ---')
    console.log('Intentionally mutating Experience #1955 catalog with corrupted data & 999,999 EGP rate...')

    const corruptedAccommodationsPayload = [
      {
        order: 1,
        nights: 10, // Changed from 5
        options: [
          {
            property: 17, // Four Seasons
            roomCategory: 'Corrupted Suite X',
            boardBasis: 'bed_and_breakfast' as const,
            pricingUnit: 'per_stay' as const,
            roomRates: [
              { occupancy: 'double' as const, rateEGP: 999999, enabled: true },
            ],
          },
        ],
      },
    ]

    await payload.update({
      collection: 'experiences',
      id: 1955,
      data: {
        accommodations: corruptedAccommodationsPayload as any,
      },
    })
    console.log('Mutated catalog in database. Now reloading the existing customer booking...')

    const historicalDossier = await BookingDetailsLoader.loadByNumber(createdBookingNumber, testUserId, {
      locale: 'en',
      currency: 'EGP',
    })

    if (!historicalDossier) {
      throw new Error('Failed to reload historical booking after catalog mutation!')
    }

    console.log(`Reloaded Historical Booking: Reference #${historicalDossier.bookingNumber}`)
    console.log(`Historical Stays count: ${historicalDossier.stays?.length}`)

    if (!historicalDossier.stays || historicalDossier.stays.length !== 2) {
      throw new Error(`Historical stays corrupted! Expected 2 stays, got ${historicalDossier.stays?.length}`)
    }

    const hStay1 = historicalDossier.stays[0]
    const hStay2 = historicalDossier.stays[1]

    console.log(`  Stay 1 historical: "${hStay1.propertyName}" (${hStay1.nights} Nights)`)
    console.log(`  Stay 2 historical: "${hStay2.propertyName}" (${hStay2.nights} Nights)`)

    // Assert that the historical booking is 100% UNTOUCHED by the catalog change
    if (hStay1.propertyName !== 'The Ritz Paris') {
      throw new Error(`CRITICAL FAILURE: Historical Stay 1 corrupted by catalog change! Got: ${hStay1.propertyName}`)
    }
    if (hStay1.nights !== 5) {
      throw new Error(`CRITICAL FAILURE: Historical Stay 1 nights corrupted! Expected 5, got ${hStay1.nights}`)
    }
    if (hStay2.propertyName !== 'Al Maha, a Luxury Collection Desert Resort & Spa, Dubai') {
      throw new Error(`CRITICAL FAILURE: Historical Stay 2 corrupted by catalog change! Got: ${hStay2.propertyName}`)
    }
    if (hStay2.nights !== 3) {
      throw new Error(`CRITICAL FAILURE: Historical Stay 2 nights corrupted! Expected 3, got ${hStay2.nights}`)
    }

    console.log('✅ HISTORICAL IMMUTABILITY COUNTER-PROOF PASSED 100%:')
    console.log('   Even though Experience #1955 was mutated to 999,999 EGP and "Corrupted Suite X",')
    console.log('   the existing Customer Booking Dossier strictly preserved "The Ritz Paris" (5 Nights)')
    console.log('   and "Al Maha Resort" (3 Nights) from its immutable PostgreSQL snapshot!')

    testPassed = true
  } finally {
    // -------------------------------------------------------------------------
    // MANDATORY GUARANTEED CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n================================================================================')
    console.log('🧹 MANDATORY CLEANUP & RESTORATION')
    console.log('================================================================================')

    // 1. Delete test booking
    if (createdBookingId) {
      console.log(`Deleting verification draft booking #${createdBookingId}...`)
      const delClient = await pool.connect()
      try {
        await delClient.query(`DELETE FROM bookings WHERE id = $1;`, [createdBookingId])
        const checkRes = await delClient.query(`SELECT id FROM bookings WHERE id = $1;`, [createdBookingId])
        if (checkRes.rows.length === 0) {
          console.log(`✅ Successfully deleted verification booking #${createdBookingId}.`)
        } else {
          console.error(`⚠️ Failed to delete verification booking #${createdBookingId}!`)
        }
      } catch (err) {
        console.error('Error during booking deletion:', err)
      } finally {
        delClient.release()
      }
    }

    // 2. Restore Package #1955 accommodations
    if (originalBackup) {
      console.log(`Restoring Experience #1955 to exact pre-test state (${originalBackup.length} stays)...`)
      try {
        await payload.update({
          collection: 'experiences',
          id: 1955,
          data: {
            accommodations: originalBackup as any,
          },
        })

        const verifiedRestored = await payload.findByID({
          collection: 'experiences',
          id: 1955,
          depth: 2,
        })
        console.log(`✅ Experience #1955 restored. Stays count: ${verifiedRestored.accommodations?.length}`)
      } catch (err) {
        console.error('CRITICAL: Failed to restore Experience #1955 accommodations:', err)
      }
    }

    // 3. Restore SessionResolver
    SessionResolver.resolve = originalSessionResolve

    console.log('================================================================================\n')
  }

  if (!testPassed) {
    throw new Error('E2E Verification failed assertions. See logs above for details.')
  }

  console.log('🎉 ALL FORENSIC E2E VERIFICATIONS & NEGATIVE ASSERTIONS PASSED WITH 100% INTEGRITY!')
  process.exit(0)
}

runVerification().catch((err) => {
  console.error('\n❌ FORENSIC VERIFICATION ENCOUNTERED AN UNEXPECTED ERROR:', err)
  process.exit(1)
})
