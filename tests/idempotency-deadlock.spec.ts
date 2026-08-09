import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'
import { BookingStatus } from '@/types'
import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import { BookingPolicy } from '@/domains/booking/policy'

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
  const customerId = 52 // test-1@mail.com
  const experienceId = 10
  const slotId = 1

  beforeAll(() => {
    vi.spyOn(SessionResolver, 'resolve').mockResolvedValue({
      isAuthenticated: true,
      customerId,
      email: 'test-1@mail.com',
      firstName: 'test-1',
      lastName: 'test',
      preferredCurrency: 'EGP',
      preferredLanguage: 'en'
    })
  })

  beforeEach(async () => {
    // Reset departure slot capacity
    const { booking: bookingService } = await getDomainServices()
    const payloadInstance = (bookingService as any).repository.payload
    await payloadInstance.update({
      collection: 'departure-slots',
      id: slotId,
      data: {
        capacityReserved: 0,
        capacitySold: 0
      }
    })
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
    const payloadInstance = (bookingService as any).repository.payload

    // Submit concurrent double-click requests
    const [res1, res2] = await Promise.all([
      confirmCheckoutAction(checkoutParams),
      confirmCheckoutAction(checkoutParams)
    ])
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
    expect(booking1.capacityHold?.status).toBe('active')

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
    const payloadInstance = (bookingService as any).repository.payload

    // Spy on reserveCapacity and force it to reject (simulating capacity full or database locking failure)
    const reserveCapacitySpy = vi.spyOn((bookingService as any).experienceService, 'reserveCapacity')
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
    const payloadInstance = (bookingService as any).repository.payload

    const attemptUUID = Math.random().toString(36).substring(2, 9)
    const idempotencyKey = `checkout:${experienceId}:${slotId}:2026-09-15:${attemptUUID}`

    // Manually insert an orphaned booking (status pending_payment, capacityHold null)
    const orphanedDoc = await payloadInstance.create({
      collection: 'bookings',
      data: {
        bookingNumber: `LBV-TEST-${Date.now()}`,
        user: customerId,
        experience: experienceId,
        status: 'pending_payment',
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        pricingSnapshot: { basePriceEGP: 1000, displayCurrency: 'EGP', displayAmount: 1000, exchangeRate: 1, totalAmountEGP: 1000, subtotalEGP: 1000 },
        capacityHold: null,
        pointHold: null,
        idempotencyKey,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '01063134412' }]
      }
    })

    // Execute the Expiration Workflow (we set the reaper window to 0 so all pending bookings are eligible)
    const expiredCount = await bookingService.workflowEngine.executeExpirationWorkflow(0)
    expect(expiredCount).toBeGreaterThanOrEqual(1)

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

    // 1. Mock expired/corrupted booking aggregate (capacityHold null)
    const corruptedBooking: any = {
      id: 999,
      customerId,
      experienceId,
      startDate: '2026-09-15',
      status: BookingStatus.PENDING_PAYMENT,
      capacityHold: null
    }

    const resCorrupted = BookingPolicy.canReuseForCheckout(corruptedBooking, customerId, experienceId, '2026-09-15')
    expect(resCorrupted.allowed).toBe(false)
    expect(resCorrupted.code).toBe('BOOKING_CORRUPTED')

    // 2. Mock expired booking aggregate (capacityHold status expired)
    const expiredBooking: any = {
      id: 998,
      customerId,
      experienceId,
      startDate: '2026-09-15',
      status: BookingStatus.EXPIRED,
      capacityHold: {
        status: 'expired',
        expiresAt: new Date(Date.now() - 1000).toISOString()
      }
    }

    const resExpired = BookingPolicy.canReuseForCheckout(expiredBooking, customerId, experienceId, '2026-09-15')
    expect(resExpired.allowed).toBe(false)
    expect(resExpired.code).toBe('BOOKING_EXPIRED')
  })
})
