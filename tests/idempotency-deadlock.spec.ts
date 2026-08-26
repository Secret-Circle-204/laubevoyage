import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'
import { BookingStatus } from '@/types'
import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import { BookingPolicy } from '@/domains/booking/policy'
import type { BookingAggregate } from '@/domains/booking/types'

// Mock next/headers for cookies
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === 'laube-locale') return { value: 'en' }
      if (name === 'laube-currency') return { value: 'EGP' }
      return undefined
    }
  })
}))

describe('Checkout Idempotency & Expiration Forensic Investigation', () => {
  let customerId: number
  let experienceId: number = 10
  let slotId: number = 1

  beforeAll(async () => {
    const { booking: bookingService } = await getDomainServices()
    const payloadInstance = bookingService['repository']['payload']
    
    // Create isolated dedicated package experience
    try {
      const cityRes = await payloadInstance.find({ collection: 'cities', limit: 1 })
      const cityId = cityRes.docs.length > 0 ? cityRes.docs[0].id : 1

      const newExp = await payloadInstance.create({
        collection: 'experiences',
        data: {
          title: `Idempotency Test Package ${Date.now()}`,
          slug: `idempotency-pkg-${Date.now()}`,
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
      experienceId = Number(newExp.id)
    } catch (err) {
      console.error('[idempotency-deadlock.spec] Failed to create test experience:', err)
      throw err
    }

    // Seed customer or resolve existing
    try {
      const existing = await payloadInstance.find({
        collection: 'customers',
        where: { email: { equals: 'test-1@mail.com' } },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        customerId = Number(existing.docs[0].id)
      } else {
        const doc = await payloadInstance.create({
          collection: 'customers',
          data: {
            email: 'test-1@mail.com',
            firstName: 'test-1',
            lastName: 'test',
            status: 'active',
            password: 'MockPassword123!',
          }
        } as any)
        customerId = Number(doc.id)
        console.log(`[idempotency-deadlock.spec] Seeded customer #${customerId}`)
      }
    } catch (err) {
      console.error(`[idempotency-deadlock.spec] Failed to seed customer:`, err)
      throw err
    }

    // Seed or resolve slot
    try {
      const existingSlot = await payloadInstance.find({
        collection: 'departure-slots',
        where: { experience: { equals: experienceId } },
        limit: 1,
      })
      if (existingSlot.docs.length > 0) {
        slotId = Number(existingSlot.docs[0].id)
      } else {
        const doc = await payloadInstance.create({
          collection: 'departure-slots',
          data: {
            departureId: `IDEMP-${experienceId}-2026-09-15-0900`,
            experience: experienceId,
            date: '2026-09-15',
            startTime: '09:00',
            capacityTotal: 20,
            capacityReserved: 0,
            capacitySold: 0,
            capacityAvailable: 20,
            version: 1,
            status: 'available',
          }
        } as any)
        slotId = Number(doc.id)
      }
    } catch (err) {
      console.error(`[idempotency-deadlock.spec] Failed to seed slot:`, err)
      throw err
    }

    vi.spyOn(SessionResolver, 'resolve').mockResolvedValue({
      isAuthenticated: true,
      customerId,
      email: 'test-1@mail.com',
      firstName: 'test-1',
      lastName: 'test',
      preferredCurrency: 'EGP',
      preferredLanguage: 'en'
    })
  }, 60000)

  afterAll(async () => {
    const { booking: bookingService } = await getDomainServices()
    const payloadInstance = bookingService['repository']['payload']
    try {
      if (slotId) await payloadInstance.delete({ collection: 'departure-slots', id: slotId }).catch(() => null)
      if (experienceId) await payloadInstance.delete({ collection: 'experiences', id: experienceId }).catch(() => null)
      if (customerId) await payloadInstance.delete({ collection: 'customers', id: customerId }).catch(() => null)
    } catch {}
  }, 60000)

  beforeEach(async () => {
    // Reset departure slot capacity for THIS test's slot only
    if (!slotId) return
    try {
      const { booking: bookingService } = await getDomainServices()
      const payloadInstance = bookingService['repository']['payload']
      await payloadInstance.update({
        collection: 'departure-slots',
        id: slotId,
        data: {
          capacityReserved: 0,
          capacitySold: 0,
        },
      })
    } catch {}
  })

  it('Test A: should perform idempotent retries for active checkout attempts (Concurrency Recovery)', async () => {
    const attemptUUID = Math.random().toString(36).substring(2, 9)
    const idempotencyKey = `checkout:${experienceId}:${slotId}:2026-09-15:${attemptUUID}`

    const checkoutParams = {
      bookingId: 'new',
      experienceId,
      slotId,
      adults: 1,
      travelers: [
        { firstName: 'test-1', lastName: 'test', email: 'test-1@mail.com', phone: '01063134412' }
      ],
      gatewayId: 'stripe',
      idempotencyKey
    }

    const { booking: bookingService } = await getDomainServices()
    const payloadInstance = bookingService['repository']['payload']

    // Submit concurrent double-click requests
    type CheckoutResult = { success: boolean; error?: string; bookingNumber?: string; checkoutUrl?: string }
    const [res1, res2] = (await Promise.all([
      confirmCheckoutAction(checkoutParams),
      confirmCheckoutAction(checkoutParams)
    ])) as [CheckoutResult, CheckoutResult]
    expect(res1.success).toBe(true)
    expect(res2.success).toBe(true)
    expect(res1.bookingNumber).toBe(res2.bookingNumber)
    const bookingNumber1 = res1.bookingNumber

    // Verify only ONE booking document exists in the database for this key
    const bookings = await payloadInstance.find({
      collection: 'bookings',
      where: { idempotencyKey: { equals: idempotencyKey } }
    })
    expect(bookings.docs.length).toBe(1)
    const booking1 = bookings.docs[0]
    expect(booking1.status).toBe(BookingStatus.PENDING_PAYMENT)
    const capacityHold = booking1.capacityHold
    if (capacityHold && typeof capacityHold === 'object' && !Array.isArray(capacityHold)) {
      expect((capacityHold as { status?: string }).status).toBe('active')
    } else {
      throw new Error('capacityHold is not an object')
    }

    // Cleanup
    await payloadInstance.delete({
      collection: 'bookings',
      id: booking1.id
    })
  })

  it('Test B: should rollback booking creation completely on transaction failure (Rollback Boundary Integrity)', async () => {
    const attemptUUID = Math.random().toString(36).substring(2, 9)
    const idempotencyKey = `checkout:${experienceId}:${slotId}:2026-09-15:${attemptUUID}`

    const checkoutParams = {
      bookingId: 'new',
      experienceId,
      slotId,
      adults: 1,
      travelers: [
        { firstName: 'test-1', lastName: 'test', email: 'test-1@mail.com', phone: '01063134412' }
      ],
      gatewayId: 'stripe',
      idempotencyKey
    }

    const { booking: bookingService } = await getDomainServices()
    const payloadInstance = bookingService['repository']['payload']

    // Spy on reserveCapacity and force it to reject (simulating capacity full or database locking failure)
    const reserveCapacitySpy = vi.spyOn(bookingService['experienceService'], 'reserveCapacity')
      .mockRejectedValueOnce(new Error('MOCK_CAPACITY_RESERVATION_FAILURE'))

    // Trigger the checkout action - should fail because of reservation error
    const res = await confirmCheckoutAction(checkoutParams)
    expect(res.success).toBe(false)
    expect(res.error).toContain('MOCK_CAPACITY_RESERVATION_FAILURE')

    // ASSERT: Due to rollback transaction being correctly cased and linked, no booking should be created
    const bookings = await payloadInstance.find({
      collection: 'bookings',
      where: { idempotencyKey: { equals: idempotencyKey } }
    })
    expect(bookings.docs.length).toBe(0)

    reserveCapacitySpy.mockRestore()
  })

  it('Test C: should clean up orphaned bookings with missing holds to EXPIRED (Legacy Orphan Cleanup)', async () => {
    const { booking: bookingService } = await getDomainServices()
    const payloadInstance = bookingService['repository']['payload']

    const attemptUUID = Math.random().toString(36).substring(2, 9)
    const idempotencyKey = `checkout:${experienceId}:${slotId}:2026-09-15:${attemptUUID}`

    // Manually insert an orphaned booking (status pending_payment, capacityHold null)
    const orphanedDoc = await payloadInstance.create({
      collection: 'bookings',
      draft: true,
      data: {
        bookingNumber: `LBV-TEST-${Date.now()}`,
        user: customerId,
        experience: experienceId,
        status: 'pending_payment',
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        pricingSnapshot: { basePriceEGP: 1000, displayCurrency: 'EGP', displayAmount: 1000, exchangeRate: 1, totalAmountEGP: 1000, subtotalEGP: 1000 },
        capacityHold: null,
        pointHold: null,
        idempotencyKey,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '01063134412' }]
      }
    })

    // Execute the Expiration Workflow for this specific orphaned booking
    const orphanedAggregate = await bookingService.getById(orphanedDoc.id)
    await (bookingService as any).workflowEngine.expiration.expireBookingWithRetry(orphanedAggregate)

    // Verify the booking is now EXPIRED in the database (no longer pending_payment)
    const updatedDoc = await payloadInstance.findByID({
      collection: 'bookings',
      id: orphanedDoc.id
    })
    expect(updatedDoc.status).toBe(BookingStatus.EXPIRED)

    // Cleanup
    await payloadInstance.delete({
      collection: 'bookings',
      id: orphanedDoc.id
    })
  })

  it('Test D: should prevent recovery or reuse of expired/corrupted bookings (Recovery Guard)', async () => {
    const { booking: bookingService } = await getDomainServices()

    // 1. Mock corrupted booking aggregate (capacityHold released/invalid)
    const corruptedBooking = {
      id: 999,
      customerId,
      experienceId,
      startDate: '2026-09-15',
      status: BookingStatus.PENDING_PAYMENT,
      paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      capacityHold: {
        status: 'released',
      },
    } as unknown as BookingAggregate

    const resCorrupted = BookingPolicy.canReuseForCheckout(corruptedBooking, customerId, experienceId, '2026-09-15')
    expect(resCorrupted.allowed).toBe(false)
    expect(resCorrupted.code).toBe('BOOKING_CORRUPTED')

    // 2. Mock expired booking aggregate (payment window expired)
    const expiredBooking = {
      id: 998,
      customerId,
      experienceId,
      startDate: '2026-09-15',
      status: BookingStatus.EXPIRED,
      paymentWindowExpiresAt: new Date(Date.now() - 1000).toISOString(),
      capacityHold: {
        status: 'expired',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    } as unknown as BookingAggregate

    const resExpired = BookingPolicy.canReuseForCheckout(expiredBooking, customerId, experienceId, '2026-09-15')
    expect(resExpired.allowed).toBe(false)
    expect(resExpired.code).toBe('BOOKING_EXPIRED')
  })
})
