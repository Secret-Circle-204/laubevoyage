import { describe, it, expect, beforeAll } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDomainServices } from '@/domains/factory'
import { BookingStatus } from '@/types'

describe('BATCH 18 Integration: Full End-to-End Inventory Reconciliation & Fail-Fast Integrity', () => {
  let payload: any
  let experienceService: any
  let bookingService: any
  let testCustomer: any
  let testExperience: any
  let testSlot: any
  const createdBookingIds: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })
    const services = await getDomainServices()
    experienceService = services.experience
    bookingService = services.booking

    // 1. Create Test Customer
    testCustomer = await payload.create({
      collection: 'customers',
      data: {
        email: `test_recon_${Date.now()}@example.com`,
        firstName: 'Reconciliation',
        lastName: 'TestUser',
        status: 'active',
        password: 'password123',
      },
    })

    // 2. Create fresh dedicated test package experience (Fixed Package with physical inventory)
    const cityRes = await payload.find({ collection: 'cities', limit: 1 })
    const cityId = cityRes.docs.length > 0 ? cityRes.docs[0].id : 1

    testExperience = await payload.create({
      collection: 'experiences',
      data: {
        title: `Inventory Recon Package ${Date.now()}`,
        slug: `inventory-recon-${Date.now()}`,
        type: 'package',
        packageMode: 'fixed_date',
        city: cityId,
        duration: {
          days: 3,
          nights: 2,
        },
        price: 5000,
        availability: 'available',
      } as any,
    })

    // 3. Create test departure slot
    testSlot = await payload.create({
      collection: 'departure-slots',
      data: {
        departureId: `DEP-RECON-${Date.now()}`,
        experience: testExperience.id,
        date: '2026-11-20',
        startTime: '09:00',
        capacityTotal: 20,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 20,
        version: 1,
        status: 'available',
      },
    })
  }, 60000)

  it('audits and reconciles a live slot through real booking lifecycle states', async () => {
    const departure = await experienceService.resolveBookableDepartureBySlot(testExperience.id, testSlot.id)

    // 1. Create Booking A: 2 passengers (CONFIRMED)
    const bookingAId = await bookingService.create({
      userId: testCustomer.id,
      departure,
      travelers: [
        { firstName: 'A1', lastName: 'User', email: 'a1@mail.com', phone: '01011111111' },
        { firstName: 'A2', lastName: 'User', email: 'a2@mail.com', phone: '01011111112' },
      ],
      endDate: '2026-11-21',
      currency: 'EGP',
      source: 'website',
    })
    createdBookingIds.push(bookingAId)
    await bookingService.moveToPendingPayment(bookingAId)
    await bookingService.markAsPaid(bookingAId, {
      attemptId: 'PAY-REF-A',
      status: 'successful',
      amount: 2000,
      currency: 'EGP',
      gatewayId: 'stripe',
    })
    await bookingService.confirm(bookingAId, 'PAY-REF-A')

    // 2. Create Booking B: 3 passengers (PAID / CONFIRMED)
    const bookingBId = await bookingService.create({
      userId: testCustomer.id,
      departure,
      travelers: [
        { firstName: 'B1', lastName: 'User', email: 'b1@mail.com', phone: '01022222221' },
        { firstName: 'B2', lastName: 'User', email: 'b2@mail.com', phone: '01022222222' },
        { firstName: 'B3', lastName: 'User', email: 'b3@mail.com', phone: '01022222223' },
      ],
      endDate: '2026-11-21',
      currency: 'EGP',
      source: 'website',
    })
    createdBookingIds.push(bookingBId)
    await bookingService.moveToPendingPayment(bookingBId)
    await bookingService.markAsPaid(bookingBId, {
      attemptId: 'PAY-REF-B',
      status: 'successful',
      amount: 3000,
      currency: 'EGP',
      gatewayId: 'stripe',
    })
    await bookingService.confirm(bookingBId, 'PAY-REF-B')

    // 3. Create Booking C: 1 passenger (PENDING_PAYMENT with active hold)
    const bookingCId = await bookingService.create({
      userId: testCustomer.id,
      departure,
      travelers: [
        { firstName: 'C1', lastName: 'User', email: 'c1@mail.com', phone: '01033333331' },
      ],
      endDate: '2026-11-21',
      currency: 'EGP',
      source: 'website',
    })
    createdBookingIds.push(bookingCId)
    await bookingService.moveToPendingPayment(bookingCId)

    // 4. Create Booking D: 2 passengers (REFUNDED -> must NOT count towards Sold)
    const bookingDId = await bookingService.create({
      userId: testCustomer.id,
      departure,
      travelers: [
        { firstName: 'D1', lastName: 'User', email: 'd1@mail.com', phone: '01044444441' },
        { firstName: 'D2', lastName: 'User', email: 'd2@mail.com', phone: '01044444442' },
      ],
      endDate: '2026-11-21',
      currency: 'EGP',
      source: 'website',
    })
    createdBookingIds.push(bookingDId)
    await bookingService.moveToPendingPayment(bookingDId)
    await bookingService.markAsPaid(bookingDId, {
      attemptId: 'PAY-REF-D',
      status: 'successful',
      amount: 2000,
      currency: 'EGP',
      gatewayId: 'stripe',
    })
    await bookingService.confirm(bookingDId, 'PAY-REF-D')
    // Mark D as REFUNDED
    await payload.update({
      collection: 'bookings',
      id: bookingDId,
      data: { status: 'refunded' as any },
    })

    // ─── PHASE 1: AUDIT ───────────────────────────────────────────────
    const auditReport = await experienceService.auditSlot(testSlot.id)

    expect(auditReport.slotId).toBe(testSlot.id)
    expect(auditReport.capacityTotal).toBe(20)
    // Expected Sold: Booking A (2) + Booking B (3) = 5 (D is REFUNDED, C is PENDING)
    expect(auditReport.expectedSold).toBe(5)
    // Expected Reserved: Booking C (1)
    expect(auditReport.expectedReserved).toBe(1)
    // Expected Available: 20 - 5 - 1 = 14
    expect(auditReport.expectedAvailable).toBe(14)
    expect(auditReport.contributingBookings.length).toBe(2)
    expect(auditReport.activeHolds.length).toBe(1)

    // ─── PHASE 2: RECONCILIATION ──────────────────────────────────────
    const reconResult = await experienceService.reconcileSlot(testSlot.id)

    expect(reconResult.auditAfter.storedSold).toBe(5)
    expect(reconResult.auditAfter.storedReserved).toBe(1)
    expect(reconResult.auditAfter.storedAvailable).toBe(14)
    expect(reconResult.auditAfter.level1InvariantPassed).toBe(true)
    expect(reconResult.auditAfter.level2SourceConsistent).toBe(true)

    // ─── DETERMINISM CHECK ────────────────────────────────────────────
    const reconResult2 = await experienceService.reconcileSlot(testSlot.id)
    expect(reconResult2.reconciled).toBe(false)
  })
})
