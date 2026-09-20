import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
process.env.VITEST = 'true'

async function run() {
  console.log('🧪 Starting Gate 5 Real PostgreSQL Persistence Verification...')

  const { getApplicationServices } = await import('../application/factory')
  const { booking, bookingPricingUseCase, experience, payload } = await getApplicationServices()

  // 1. Fetch package experience
  const expDoc = await experience.getById(1955)
  if (!expDoc) {
    throw new Error('Experience #1955 not found')
  }
  console.log(`Found package: #${expDoc.id} '${expDoc.title}' with ${expDoc.accommodations?.length || 0} stays.`)

  // Stays options
  const stay1 = expDoc.accommodations?.[0]
  const stay2 = expDoc.accommodations?.[1]
  const opt1 = stay1?.options?.[0]
  const opt2 = stay2?.options?.[0]

  const selectedOptions: Record<number, string> = {}
  if (stay1 && opt1) selectedOptions[stay1.order] = opt1.id
  if (stay2 && opt2) selectedOptions[stay2.order] = opt2.id

  console.log('Selected Accommodation Options:', selectedOptions)

  // Resolve departure slot
  const departureSlots = await payload.find({
    collection: 'departure-slots',
    where: { experience: { equals: 1955 } },
    limit: 1,
  })
  const slot = departureSlots.docs[0]
  if (!slot) {
    throw new Error('No departure slot found for experience #1955')
  }

  // 2. Pricing Engine Execution
  const localeCtx = {
    language: 'en',
    currency: 'EGP',
    country: 'EG',
    timezone: 'Africa/Cairo',
    measurement: 'metric' as const,
    weekStart: 1,
  }

  console.log('Calculating pricing with selected accommodation options...')
  const pricingResult = await bookingPricingUseCase.calculate({
    experienceId: 1955,
    slotId: slot.id,
    adultsCount: 2,
    childrenCount: 0,
    selectedAccommodationOptions: selectedOptions,
    ctx: localeCtx,
  })

  const pricingSnapshot = pricingResult.snapshot
  if (!pricingSnapshot.commercialBreakdown) {
    throw new Error('FAILED: pricingSnapshot.commercialBreakdown is missing before persistence!')
  }
  console.log('✅ pricingSnapshot contains commercialBreakdown in memory.')
  console.log(`   staysBreakdown count: ${pricingSnapshot.commercialBreakdown.staysBreakdown?.length}`)
  console.log(`   roomAllocation count: ${pricingSnapshot.commercialBreakdown.roomAllocation?.length}`)

  // 3. Resolve Bookable Departure
  const departure = await experience.resolveBookableDepartureBySlot(1955, slot.id)
  if (!departure) {
    throw new Error(`Failed to resolve bookable departure for slot #${slot.id}`)
  }

  // 4. Create Booking Draft through the production Booking Service
  console.log('Creating booking draft through BookingService...')
  const testUserId = 901 // Valid customer ID in seed database
  const bookingId = await booking.create({
    userId: testUserId,
    departure,
    travelers: [
      { firstName: 'Test', lastName: 'Passenger1', email: 'lead@example.com', phone: '+201001234567', type: 'adult' },
      { firstName: 'Test', lastName: 'Passenger2', type: 'adult' },
    ],
    endDate: '2026-10-10',
    currency: 'EGP',
    source: 'website',
    pricingSnapshot: pricingSnapshot as any,
  })

  console.log(`✅ Draft Booking created with ID #${bookingId}.`)

  // 5. DIRECT POSTGRESQL RAW QUERY VERIFICATION (Zero client trust / bypass Payload memory cache)
  const pool = (payload.db as any).pool
  const client = await pool.connect()
  let persistedRow: any = null
  try {
    const rawResult = await client.query(`
      SELECT 
        id, 
        booking_number, 
        pricing_snapshot_base_price_e_g_p,
        pricing_snapshot_total_amount_e_g_p,
        pricing_snapshot_commercial_breakdown
      FROM bookings 
      WHERE id = $1;
    `, [bookingId])

    persistedRow = rawResult.rows[0]
  } finally {
    client.release()
  }

  if (!persistedRow) {
    throw new Error(`FAILED: Row for booking #${bookingId} not found in PostgreSQL!`)
  }

  console.log('\n--- PostgreSQL Raw Column Verification ---')
  console.log(`Booking Number: ${persistedRow.booking_number}`)
  console.log(`pricing_snapshot_commercial_breakdown type: ${typeof persistedRow.pricing_snapshot_commercial_breakdown}`)

  const dbBreakdown = persistedRow.pricing_snapshot_commercial_breakdown
  if (!dbBreakdown) {
    throw new Error('FAILED: pricing_snapshot_commercial_breakdown is NULL in PostgreSQL database!')
  }
  console.log('✅ pricing_snapshot_commercial_breakdown is physically stored in PostgreSQL as JSONB!')

  if (!Array.isArray(dbBreakdown.staysBreakdown) || dbBreakdown.staysBreakdown.length === 0) {
    throw new Error('FAILED: dbBreakdown.staysBreakdown is missing or empty in PostgreSQL!')
  }
  console.log(`✅ PostgreSQL stores ${dbBreakdown.staysBreakdown.length} stays in staysBreakdown:`)
  for (const s of dbBreakdown.staysBreakdown) {
    console.log(`   - Stay #${s.order}: optionId='${s.optionId}', property='${s.propertyName}', category='${s.roomCategory}', board='${s.boardBasis}', unit='${s.pricingUnit}', total=${s.stayAccommodationTotalEGP} EGP`)
    if (!s.optionId) throw new Error(`Stay #${s.order} is missing optionId in database!`)
    if (!s.propertyName) throw new Error(`Stay #${s.order} is missing propertyName in database!`)
    if (!s.appliedRoomRates || s.appliedRoomRates.length === 0) throw new Error(`Stay #${s.order} missing appliedRoomRates in database!`)
  }

  if (!Array.isArray(dbBreakdown.roomAllocation) || dbBreakdown.roomAllocation.length === 0) {
    throw new Error('FAILED: dbBreakdown.roomAllocation is missing or empty in PostgreSQL!')
  }
  console.log(`✅ PostgreSQL stores ${dbBreakdown.roomAllocation.length} rooms in roomAllocation:`)
  for (const r of dbBreakdown.roomAllocation) {
    console.log(`   - Room #${r.roomIndex}: occupancy='${r.occupancy}', adults=${r.adults}, children=${r.children}`)
  }

  // 6. Consumer Loader Verification: BookingDetailsLoader (Customer Dashboard SSOT)
  console.log('\n--- Customer Dashboard Loader Verification ---')
  const { BookingDetailsLoader } = await import('../application/dashboard/loaders')
  const customerView = await BookingDetailsLoader.loadByNumber(persistedRow.booking_number, testUserId, {
    locale: 'en',
    currency: 'EGP',
  })

  if (!customerView) {
    throw new Error(`FAILED: BookingDetailsLoader returned null for booking #${persistedRow.booking_number}`)
  }

  console.log(`Customer View Loaded: booking #${customerView.bookingNumber}`)
  console.log(`customerView.stays count: ${customerView.stays?.length || 0}`)
  console.log(`customerView.roomAllocation count: ${customerView.roomAllocation?.length || 0}`)

  if (!customerView.stays || customerView.stays.length === 0) {
    throw new Error('FAILED: customerView.stays is empty! Historical stays failed to render.')
  }
  console.log('✅ customerView.stays successfully populated from historical snapshot:')
  customerView.stays.forEach((s) => {
    console.log(`   - Stay #${s.order}: ${s.propertyName} (${s.nights} Nights), Category: ${s.roomCategory || 'N/A'}`)
  })

  if (!customerView.roomAllocation || customerView.roomAllocation.length === 0) {
    throw new Error('FAILED: customerView.roomAllocation is empty! Room configuration failed to render.')
  }
  console.log('✅ customerView.roomAllocation successfully populated from historical snapshot:')
  customerView.roomAllocation.forEach((r) => {
    console.log(`   - Room #${r.roomIndex}: ${r.occupancy}, Adults: ${r.adults}, Children: ${r.children}`)
  })

  // 7. Cleanup test booking
  console.log('\nCleaning up verification draft booking...')
  const deleteClient = await pool.connect()
  try {
    await deleteClient.query(`DELETE FROM bookings WHERE id = $1;`, [bookingId])
    console.log(`✅ Cleaned up draft booking #${bookingId}.`)
  } finally {
    deleteClient.release()
  }

  console.log('\n🎉 ALL GATE 5 PERSISTENCE VERIFICATIONS PASSED CONVINCINGLY!')
  process.exit(0)
}

run().catch((e) => {
  console.error('❌ Verification Error:', e)
  process.exit(1)
})
