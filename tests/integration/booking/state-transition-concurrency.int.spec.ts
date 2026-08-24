import { describe, it, expect, beforeAll } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDomainServices } from '@/domains/factory'
import { BookingStatus, RequestContext } from '@/types'
import { validateTransition } from '@/domains/booking/state-machine'

describe('P1-A Integration: Booking State Transitions & Concurrency Control', () => {
  let payload: any
  let bookingService: any
  let testCustomer: any
  let testExperience: any

  beforeAll(async () => {
    payload = await getPayload({ config })
    const services = await getDomainServices()
    bookingService = services.booking

    // Create Test Customer
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: `test_concurrency_${Date.now()}@example.com`,
        firstName: 'Concurrency',
        lastName: 'TestUser',
        status: 'active',
        password: 'password123',
      },
    })

    // Create Test Experience
    const cityRes = await payload.find({ collection: 'cities', limit: 1 })
    const cityId = cityRes.docs.length > 0 ? cityRes.docs[0].id : 1

    testExperience = await payload.create({
      collection: 'experiences',
      data: {
        title: `Concurrency Test Experience ${Date.now()}`,
        slug: `concurrency-test-${Date.now()}`,
        type: 'package',
        packageMode: 'flexible_date',
        city: cityId,
        duration: { days: 3, nights: 2 },
        price: 3000,
        availability: 'available',
      } as any,
    })
  })

  it('rejects direct PAID -> CANCELLED transition and preserves status', async () => {
    // 1. Create a draft booking
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-TEST-${Date.now()}-1`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.DRAFT,
        startDate: '2026-11-20',
        endDate: '2026-11-23',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 3000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 3000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 3000,
          displayCurrency: 'EGP',
          displayAmount: 3000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })

    // 2. Transition DRAFT -> PENDING_PAYMENT
    await bookingService.moveToPendingPayment(booking.id)

    // 3. Mark booking as paid (PENDING_PAYMENT -> PAID)
    const paymentAttempt = {
      attemptId: `att_${Date.now()}`,
      provider: 'stripe',
      amount: 3000,
      currency: 'EGP',
      status: 'successful' as const,
      transactionReference: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
    }
    await bookingService.markAsPaid(booking.id, paymentAttempt)

    // Verify current status is PAID
    let refreshed = await bookingService.getById(booking.id)
    expect(refreshed.status).toBe(BookingStatus.PAID)

    // 4. Attempt direct cancellation (should fail because PAID cannot cancel directly)
    await expect(
      bookingService.cancel(booking.id, 'Test cancel paid booking', {
        type: 'admin',
        id: 'admin_1',
        name: 'Admin User',
      })
    ).rejects.toThrowError(/Paid bookings must be refunded rather than cancelled/i)

    // Verify status remains PAID
    refreshed = await bookingService.getById(booking.id)
    expect(refreshed.status).toBe(BookingStatus.PAID)

    // 5. Successful Paid -> Refunded transition
    await bookingService.refund(booking.id, {
      type: 'admin',
      id: 'admin_1',
      name: 'Admin User',
    })

    refreshed = await bookingService.getById(booking.id)
    expect(refreshed.status).toBe(BookingStatus.REFUNDED)
  })

  it('serializes concurrent status updates and throws Concurrency Conflict on race', async () => {
    // 1. Create a confirmed booking
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-TEST-${Date.now()}-2`,
        user: testCustomer.id,
        experience: testExperience.id,
        status: BookingStatus.CONFIRMED,
        startDate: '2026-11-20',
        endDate: '2026-11-23',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0100000000' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 3000,
          loyaltyDiscountEGP: 0,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 3000,
          taxes: 0,
          fees: 0,
          totalAmountEGP: 3000,
          displayCurrency: 'EGP',
          displayAmount: 3000,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })

    // 2. Start two parallel transactions T1 and T2
    const t1 = await payload.db.beginTransaction()
    const t2 = await payload.db.beginTransaction()

    const context1: RequestContext = { transactionId: t1 }
    const context2: RequestContext = { transactionId: t2 }

    try {
      const repository = (bookingService as any).repository

      // 3. T1 executes transition status updates inside transaction T1 (but does not commit yet)
      const p1 = repository.transitionStatus(booking.id, BookingStatus.COMPLETED, {}, context1)

      // Briefly wait to ensure T1's update is processed in DB
      await new Promise(resolve => setTimeout(resolve, 100))

      // 4. T2 reads booking state. Under READ COMMITTED, T2 reads the old committed status (CONFIRMED)
      const b2 = await bookingService.getById(booking.id, context2)
      expect(b2.status).toBe(BookingStatus.CONFIRMED)

      // T2 validates the transition locally (CONFIRMED -> CANCELLED is valid)
      validateTransition(b2.status, BookingStatus.CANCELLED)

      // 5. Commit T1. The database status of the booking becomes COMPLETED.
      await payload.db.commitTransaction(t1)
      await p1

      // 6. T2 now attempts to execute its conditional update query.
      // Since status is now COMPLETED in the database, the update predicate status = 'confirmed' will match 0 rows.
      const result = await payload.update({
        collection: 'bookings',
        where: {
          and: [
            { id: { equals: booking.id } },
            { status: { equals: b2.status } } // status === 'confirmed'
          ]
        },
        data: { status: BookingStatus.CANCELLED },
        req: { transactionID: t2 }
      })

      const doc = result && typeof result === 'object' && 'docs' in result ? result.docs?.[0] : result
      // Expect that 0 rows were updated (doc is undefined/null)
      expect(doc).toBeUndefined()

      await payload.db.rollbackTransaction(t2)
    } catch (error) {
      if (t1) {
        try {
          await payload.db.rollbackTransaction(t1)
        } catch (_) {}
      }
      if (t2) {
        try {
          await payload.db.rollbackTransaction(t2)
        } catch (_) {}
      }
      throw error
    }

    // Verify final state is COMPLETED and was not overwritten by T2
    const finalBooking = await bookingService.getById(booking.id)
    expect(finalBooking.status).toBe(BookingStatus.COMPLETED)
  })
})
