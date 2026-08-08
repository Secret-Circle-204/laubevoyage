import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { BookableDeparture } from '../domains/experience/bookable-departure'
import { getDomainServices } from '../domains/factory'

async function run() {
  console.log('🏁 INITIALIZING PAYLOAD & POSTGRESQL CONNECTION...')
  const payload = await getPayload({ config })
  const { booking: bookingService, experience: experienceService } = await getDomainServices()

  console.log('🧹 CLEANING UP EXISTING TEST DATA...')
  const existingBookings = await payload.find({
    collection: 'bookings',
    where: {
      bookingNumber: { like: 'TEST-CNC' },
    },
    limit: 100,
  })
  for (const b of existingBookings.docs) {
    await payload.delete({ collection: 'bookings', id: b.id })
  }

  // Find or create test customer A
  let customerA: any
  const existingCustA = await payload.find({
    collection: 'customers',
    where: { email: { equals: 'test_concurrency_a@example.com' } },
    limit: 1,
  })
  if (existingCustA.docs.length > 0) {
    customerA = existingCustA.docs[0]
  } else {
    customerA = await payload.create({
      collection: 'customers',
      data: {
        email: 'test_concurrency_a@example.com',
        firstName: 'TestA',
        lastName: 'Concurrency',
        status: 'active',
        password: 'password123',
      },
    } as any)
  }

  // Find or create test customer B
  let customerB: any
  const existingCustB = await payload.find({
    collection: 'customers',
    where: { email: { equals: 'test_concurrency_b@example.com' } },
    limit: 1,
  })
  if (existingCustB.docs.length > 0) {
    customerB = existingCustB.docs[0]
  } else {
    customerB = await payload.create({
      collection: 'customers',
      data: {
        email: 'test_concurrency_b@example.com',
        firstName: 'TestB',
        lastName: 'Concurrency',
        status: 'active',
        password: 'password123',
      },
    } as any)
  }

  // Find or create test city
  const cities = await payload.find({ collection: 'cities', limit: 1 })
  let cityId: any
  if (cities.docs.length > 0) {
    cityId = cities.docs[0].id
  } else {
    const countries = await payload.find({ collection: 'countries', limit: 1 })
    let countryId = countries.docs[0]?.id
    if (!countryId) {
      const country = await payload.create({
        collection: 'countries',
        data: { name: 'Egypt', code: 'EG' }
      } as any)
      countryId = country.id
    }
    const city = await payload.create({
      collection: 'cities',
      data: { name: 'Cairo', country: countryId }
    } as any)
    cityId = city.id
  }

  // Find or create test experience
  let experience: any
  const existingExp = await payload.find({
    collection: 'experiences',
    where: { slug: { equals: 'concurrency-test-exp' } },
    limit: 1,
  })
  if (existingExp.docs.length > 0) {
    experience = existingExp.docs[0]
  } else {
    experience = await payload.create({
      collection: 'experiences',
      data: {
        title: 'Concurrency Test Experience',
        slug: 'concurrency-test-exp',
        type: 'package',
        availability: 'available',
        price: 5000,
        city: cityId,
        duration: { days: 3, nights: 2 },
      },
    })
  }

  // Delete existing slot to start fresh
  const oldSlots = await payload.find({
    collection: 'departure-slots',
    where: { experience: { equals: experience.id } },
  })
  for (const s of oldSlots.docs) {
    await payload.delete({ collection: 'departure-slots', id: s.id })
  }

  // Create slot with exactly 1 capacity available
  const slot = await payload.create({
    collection: 'departure-slots',
    data: {
      experience: experience.id,
      date: '2026-10-01',
      startTime: '09:00',
      basePriceEGP: 5000,
      capacityTotal: 10,
      capacityReserved: 9, // Exactly 1 seat remaining
      capacitySold: 0,
      capacityAvailable: 1,
      status: 'available',
      departureId: `dep_cnc_${Date.now()}`,
      version: 1,
    },
  })

  const departure = new BookableDeparture({
    experienceId: experience.id,
    experienceTitle: experience.title,
    experienceType: experience.type,
    departureId: slot.departureId,
    date: '2026-10-01',
    startTime: '09:00',
    basePriceEGP: 5000,
    capacityAvailable: 1,
    capacityTotal: 10,
    status: 'available',
  })

  console.log('\n--- 🚀 TEST 1: CONCURRENT IDEMPOTENCY KEY RACE ---')
  const idempotencyKey = `cnc_key_${Date.now()}`

  async function executeSecureCheckout(userId: number) {
    const transactionID = await payload.db.beginTransaction()
    const req = { transactionID } as any

    try {
      const bookingId = await bookingService.create({
        userId,
        departure,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+123456789' }],
        endDate: '2026-10-05',
        currency: 'EGP',
        source: 'website',
        idempotencyKey,
      }, req)

      await bookingService.moveToPendingPayment(bookingId, req)
      await payload.db.commitTransaction(transactionID as any)
      return { success: true, bookingId, recovered: false }
    } catch (err: any) {
      if (transactionID) {
        await payload.db.rollbackTransaction(transactionID as any)
      }

      // Concurrency Recovery: Lookup booking by exact idempotencyKey outside the rolled back transaction
      const existing = await bookingService.getByIdempotencyKey(idempotencyKey)
      if (existing) {
        return { success: true, bookingId: existing.id, recovered: true }
      }

      throw err
    }
  }

  // Execute 2 concurrent requests with same idempotency key
  const [resA, resB] = await Promise.all([
    executeSecureCheckout(customerA.id),
    executeSecureCheckout(customerA.id),
  ])

  console.log(`- Request A Result:`, resA)
  console.log(`- Request B Result:`, resB)

  if (resA.bookingId === resB.bookingId && (resA.recovered || resB.recovered)) {
    console.log('✅ TEST 1 PASSED: Both concurrent requests resolved successfully to the same Booking ID!')
  } else {
    console.error(`❌ TEST 1 FAILED! Did not resolve to the same ID or recover.`)
    process.exit(1)
  }

  console.log('\n--- 🚀 TEST 2: CONCURRENT LAST-SEAT RACE ---')

  // Re-seed slot with exactly 1 capacity
  await payload.update({
    collection: 'departure-slots',
    id: slot.id,
    data: {
      capacityReserved: 9,
      capacityAvailable: 1,
      version: 1,
    },
  })

  async function executeLastSeatCheckout(userId: number, key: string) {
    const transactionID = await payload.db.beginTransaction()
    const req = { transactionID } as any

    try {
      const bookingId = await bookingService.create({
        userId,
        departure,
        travelers: [{ firstName: 'User', lastName: 'Test', email: 'user@example.com', phone: '+123' }],
        endDate: '2026-10-05',
        currency: 'EGP',
        source: 'website',
        idempotencyKey: key,
      }, req)

      await bookingService.moveToPendingPayment(bookingId, req)
      await payload.db.commitTransaction(transactionID as any)
      return { success: true, bookingId }
    } catch (err: any) {
      if (transactionID) {
        await payload.db.rollbackTransaction(transactionID as any)
      }
      return { success: false, error: err.message }
    }
  }

  // Spawn 2 concurrent checkouts for different users to claim the 1 last remaining seat
  const [raceResA, raceResB] = await Promise.all([
    executeLastSeatCheckout(customerA.id, `cnc_user_a_${Date.now()}`),
    executeLastSeatCheckout(customerB.id, `cnc_user_b_${Date.now()}`),
  ])

  console.log(`- User A Checkout Result:`, raceResA)
  console.log(`- User B Checkout Result:`, raceResB)

  const successCount = [raceResA, raceResB].filter((r) => r.success).length
  const failureCount = [raceResA, raceResB].filter((r) => !r.success).length
  const failureError = [raceResA, raceResB].find((r) => !r.success)?.error || ''

  const updatedSlot = await payload.findByID({
    collection: 'departure-slots',
    id: slot.id,
  })
  console.log(`- Slot Capacity Reserved: ${updatedSlot.capacityReserved}`)
  console.log(`- Slot Capacity Available: ${updatedSlot.capacityAvailable}`)

  if (successCount === 1 && failureCount === 1 && updatedSlot.capacityAvailable === 0) {
    console.log('✅ TEST 2 PASSED: Exactly 1 concurrent request succeeded, other failed. Seat capacity is locked perfectly at 0!')
  } else {
    console.error('❌ TEST 2 FAILED: Overbooking or incorrect transaction concurrency happened!')
    process.exit(1)
  }

  console.log('\n🧹 CLEANING UP GENERATED DATA...')
  if (resA.bookingId) await payload.delete({ collection: 'bookings', id: resA.bookingId })
  if (raceResA.success && raceResA.bookingId) await payload.delete({ collection: 'bookings', id: raceResA.bookingId })
  if (raceResB.success && raceResB.bookingId) await payload.delete({ collection: 'bookings', id: raceResB.bookingId })
  await payload.delete({ collection: 'departure-slots', id: slot.id })
  await payload.delete({ collection: 'experiences', id: experience.id })

  console.log('🎉 ALL CONCURRENCY INTEGRATION TESTS PASSED!')
  process.exit(0)
}

run().catch((err) => {
  console.error('Fatal concurrency testing error:', err)
  process.exit(1)
})
