process.env.TZ = 'UTC'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDomainServices } from '@/domains/factory'
import { registerLoyaltySubscriber } from '@/domains/events/subscribers/loyalty-subscriber'
import { EventBus } from '@/domains/events/event-bus'
import type { BookingCancelledEvent } from '@/domains/events/booking-events'
import { BookingStatus } from '@/types'

describe('Loyalty Cancellation Real PostgreSQL Isolation Integration Tests', () => {
  let payload: any
  let loyaltyService: any
  let testCustomerId: number
  let testExperienceId: number
  let testCityId: number
  const createdBookingIds: number[] = []
  const createdLedgerIds: string[] = []
  const createdCustomerIds: number[] = []
  const createdExperienceIds: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })
    const services = await getDomainServices()
    loyaltyService = services.loyalty

    // Ensure loyalty subscribers are registered
    registerLoyaltySubscriber(payload, services.customer, services.loyalty)

    // 1. Ensure City exists in PostgreSQL
    const cities = await payload.find({ collection: 'cities', limit: 1 })
    if (cities.docs.length > 0) {
      testCityId = cities.docs[0].id
    } else {
      const newCity = await payload.create({
        collection: 'cities',
        data: { name: 'Cairo Iso', slug: 'cairo-test-iso' },
      })
      testCityId = newCity.id
    }

    // 2. Create real test customer in PostgreSQL
    const timestamp = Date.now()
    const customer = await payload.create({
      collection: 'customers',
      data: {
        email: `cancellation_iso_${timestamp}@example.com`,
        firstName: 'Isolation',
        lastName: 'Tester',
        status: 'active',
        password: 'Password123!',
        phone: '+201000000001',
        loyalty: {
          points: 0,
          tier: 'explorer',
          totalSpent: 3480,
        },
      },
    })
    testCustomerId = customer.id
    createdCustomerIds.push(testCustomerId)

    // 3. Create real test experience in PostgreSQL
    const experience = await payload.create({
      collection: 'experiences',
      data: {
        title: 'Isolation Test Experience',
        slug: `iso-exp-${timestamp}`,
        type: 'package',
        packageMode: 'flexible_date',
        city: testCityId,
        duration: { days: 2, nights: 1 },
        price: 3500,
        availability: 'available',
      } as any,
    })
    testExperienceId = experience.id
    createdExperienceIds.push(testExperienceId)
  })

  afterAll(async () => {
    // Cleanup bookings
    for (const bId of createdBookingIds) {
      try {
        await payload.delete({ collection: 'bookings', id: bId })
      } catch {}
    }
    // Cleanup ledger entries
    for (const ledgId of createdLedgerIds) {
      try {
        await payload.delete({ collection: 'point-ledger', id: ledgId })
      } catch {}
    }
    // Cleanup experiences
    for (const expId of createdExperienceIds) {
      try {
        await payload.delete({ collection: 'experiences', id: expId })
      } catch {}
    }
    // Cleanup customers
    for (const custId of createdCustomerIds) {
      try {
        await payload.delete({ collection: 'customers', id: custId })
      } catch {}
    }
  })

  it('proves Transaction A COMMITS (+200 refund) while Transaction B ROLLS BACK (-3480 reverse) on live PostgreSQL', async () => {
    const bookingTotalEGP = 3480

    // 1. Create a real Booking record in PostgreSQL to satisfy foreign key constraints
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        bookingNumber: `BK-ISO-${Date.now()}`,
        user: testCustomerId,
        experience: testExperienceId,
        status: BookingStatus.CONFIRMED,
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        travelers: [
          { firstName: 'Isolation', lastName: 'Tester', email: 'iso@test.com', phone: '+201000000001' },
        ],
        pricingSnapshot: {
          snapshotId: `snap_iso_${Date.now()}`,
          snapshotVersion: 'v1',
          pricingRuleVersion: 'v1.0.0',
          exchangeRateVersion: 'v1.0.0',
          basePriceEGP: 3500,
          loyaltyDiscountEGP: 20,
          promotionDiscountEGP: 0,
          couponDiscountEGP: 0,
          subtotalEGP: 3480,
          taxes: 0,
          fees: 0,
          totalAmountEGP: bookingTotalEGP,
          displayCurrency: 'EGP',
          displayAmount: bookingTotalEGP,
          exchangeRate: 1,
          exchangeRateTimestamp: new Date().toISOString(),
          calculatedAt: new Date().toISOString(),
        },
      },
    })
    const bookingId = booking.id
    createdBookingIds.push(bookingId)

    // 2. Seed historical ledger entries in PostgreSQL linked to this real booking:
    // Entry 1: Redeem -200
    const ledgRedeem = await payload.create({
      collection: 'point-ledger',
      data: {
        user: testCustomerId,
        type: 'redeem',
        amount: -200,
        balance: 0,
        booking: bookingId,
        referenceType: 'booking',
        referenceId: String(bookingId),
        reason: `Points redeemed for booking #${bookingId}`,
      },
    })
    createdLedgerIds.push(ledgRedeem.id)

    // Entry 2: Earn +3480
    const ledgEarn = await payload.create({
      collection: 'point-ledger',
      data: {
        user: testCustomerId,
        type: 'earn',
        amount: 3480,
        balance: 3480,
        booking: bookingId,
        referenceType: 'booking',
        referenceId: String(bookingId),
        reason: `Points earned for booking #${bookingId}`,
      },
    })
    createdLedgerIds.push(ledgEarn.id)

    // Entry 3: Customer spends all 3480 points on another activity -> Running balance in PostgreSQL becomes exactly 0
    const ledgSpend = await payload.create({
      collection: 'point-ledger',
      data: {
        user: testCustomerId,
        type: 'redeem',
        amount: -3480,
        balance: 0,
        reason: 'Spent 3480 points on another reservation',
      },
    })
    createdLedgerIds.push(ledgSpend.id)

    // Verify initial running balance in PostgreSQL is 0
    const initialBalance = await loyaltyService.getCustomerBalance(testCustomerId)
    expect(initialBalance).toBe(0)

    // 3. Dispatch BOOKING_CANCELLED event to LoyaltySubscriber
    const eventBus = EventBus.getInstance()
    const cancelEvent: BookingCancelledEvent = {
      type: 'BOOKING_CANCELLED',
      eventId: `evt_cancel_iso_${testCustomerId}_${Date.now()}`,
      correlationId: `corr_cancel_iso_${testCustomerId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      actor: { type: 'admin', id: 1 },
      reason: 'Administrative cancellation test',
      booking: {
        id: bookingId,
        customerId: testCustomerId,
        experienceId: testExperienceId,
        status: 'cancelled',
        pricingSnapshot: {
          basePriceEGP: 3500,
          loyaltyDiscountEGP: 20,
          totalAmountEGP: bookingTotalEGP,
          exchangeRate: 1,
          currency: 'EGP',
        },
      } as any,
    }

    // Publishing will execute the dual-transaction subscriber handler:
    // Transaction A commits (+200 refund + spend reduction)
    // Transaction B throws FinancialInvariantException (0 + 200 - 3480 = -3280 < 0) and rolls back
    try {
      await eventBus.publish(cancelEvent)
    } catch (err: any) {
      // Expected to catch the thrown error from failed Transaction B
      expect(err.message).toContain('Insufficient Funds')
    }

    // 4. Query PostgreSQL afresh with independent queries to verify persistent database state
    const freshCustomer = await payload.findByID({
      collection: 'customers',
      id: testCustomerId,
    })

    const freshLedger = await payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: testCustomerId },
        booking: { equals: bookingId },
      },
    })

    // A. PROVE TRANSACTION A IS DURABLE IN POSTGRESQL:
    // The customer received the +200 refund and totalSpent was deducted by 3480
    expect(freshCustomer.loyalty.points).toBe(200)
    expect(freshCustomer.loyalty.totalSpent).toBe(0) // 3480 - 3480 = 0

    // B. PROVE REFUND LEDGER ENTRY EXISTS IN POSTGRESQL:
    const refundEntry = freshLedger.docs.find((d: any) => d.type === 'refund')
    expect(refundEntry).toBeDefined()
    expect(refundEntry.amount).toBe(200)
    expect(refundEntry.balance).toBe(200)
    if (refundEntry) createdLedgerIds.push(refundEntry.id)

    // C. PROVE TRANSACTION B ROLLED BACK COMPLETELY IN POSTGRESQL:
    // No reverse ledger entry exists for this booking!
    const reverseEntry = freshLedger.docs.find((d: any) => d.type === 'reverse')
    expect(reverseEntry).toBeUndefined()

    // D. PROVE ZERO NEGATIVE BALANCES IN POSTGRESQL:
    expect(freshCustomer.loyalty.points).toBeGreaterThanOrEqual(0)

    // 5. PROVE PHASE A IDEMPOTENCY ON POSTGRESQL:
    // Execute Phase A directly a second time
    const resA2 = await loyaltyService.processBookingRedemptionRefund(testCustomerId, bookingId, bookingTotalEGP)
    expect(resA2.pointsRedeemed).toBe(0)

    // Verify totalSpent in PostgreSQL was NOT decremented again below 0
    const freshCustomerAfterSecondCall = await payload.findByID({
      collection: 'customers',
      id: testCustomerId,
    })
    expect(freshCustomerAfterSecondCall.loyalty.totalSpent).toBe(0)
    expect(freshCustomerAfterSecondCall.loyalty.points).toBe(200)
  })
})
