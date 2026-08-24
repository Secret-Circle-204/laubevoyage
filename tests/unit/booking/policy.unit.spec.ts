import { describe, it, expect } from 'vitest'
import { BookingPolicy } from '@/domains/booking/policy'
import { BookingStatus } from '@/types'
import type { BookingAggregate, Actor } from '@/domains/booking/types'

describe('Layer 2: BookingPolicy Unit Tests', () => {
  describe('canCreate', () => {
    it('should disallow creation if customer account is suspended', () => {
      const result = BookingPolicy.canCreate('suspended', 'available')
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('USER_INACTIVE')
    })

    it('should disallow creation if experience is sold out', () => {
      const result = BookingPolicy.canCreate('active', 'sold_out')
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('EXPERIENCE_UNAVAILABLE')
    })

    it('should disallow creation if departure is in the past', () => {
      const result = BookingPolicy.canCreate('active', 'available', {
        allowed: false,
        code: 'DEPARTURE_IN_PAST',
        reason: 'Departure has already started or passed.',
      })
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('DEPARTURE_IN_PAST')
    })

    it('should allow creation for active user, available experience, and bookable departure', () => {
      const result = BookingPolicy.canCreate('active', 'available', { allowed: true })
      expect(result.allowed).toBe(true)
    })
  })

  describe('canRedeemPoints', () => {
    it('should disallow redemption if requested points exceed available balance', () => {
      const result = BookingPolicy.canRedeemPoints(100, 200)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INSUFFICIENT_LOYALTY_POINTS')
    })

    it('should allow valid points redemption within balance', () => {
      const result = BookingPolicy.canRedeemPoints(500, 200)
      expect(result.allowed).toBe(true)
    })
  })

  describe('canConfirm', () => {
    it('should disallow confirmation if status is not PAID', () => {
      const mockBooking = { status: BookingStatus.DRAFT } as BookingAggregate
      const result = BookingPolicy.canConfirm(mockBooking)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INVALID_STATUS_FOR_CONFIRMATION')
    })

    it('should allow confirmation if status is PAID', () => {
      const mockBooking = { status: BookingStatus.PAID } as BookingAggregate
      const result = BookingPolicy.canConfirm(mockBooking)
      expect(result.allowed).toBe(true)
    })
  })

  describe('canCancel', () => {
    it('should disallow cancellation if booking is COMPLETED', () => {
      const mockBooking = { status: BookingStatus.COMPLETED } as BookingAggregate
      const actor: Actor = { id: 1, type: 'customer' }
      const result = BookingPolicy.canCancel(mockBooking, actor)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('BOOKING_ALREADY_COMPLETED')
    })

    it('should disallow customer cancellation within 24 hours of trip start', () => {
      const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      const mockBooking = { status: BookingStatus.CONFIRMED, startDate: tomorrow } as BookingAggregate
      const actor: Actor = { id: 1, type: 'customer' }

      const result = BookingPolicy.canCancel(mockBooking, actor)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('CANCELLATION_WINDOW_EXPIRED')
    })

    it('should allow admin cancellation anytime before completion', () => {
      const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      const mockBooking = { status: BookingStatus.CONFIRMED, startDate: tomorrow } as BookingAggregate
      const actor: Actor = { id: 'admin1', type: 'admin' }

      const result = BookingPolicy.canCancel(mockBooking, actor)
      expect(result.allowed).toBe(true)
    })
  })

  describe('canComplete', () => {
    it('should disallow completion if booking status is not CONFIRMED', () => {
      const mockBooking = {
        status: BookingStatus.DRAFT,
        completionAt: new Date(Date.now() - 1000).toISOString(),
      } as BookingAggregate

      const result = BookingPolicy.canComplete(mockBooking)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INVALID_STATUS_FOR_COMPLETION')
    })

    it('should throw explicit fail-fast error if completionAt snapshot is missing', () => {
      const mockBooking = {
        id: 101,
        bookingNumber: 'LBV-260822-00001',
        status: BookingStatus.CONFIRMED,
        completionAt: '',
      } as unknown as BookingAggregate

      expect(() => BookingPolicy.canComplete(mockBooking)).toThrowError(
        /is missing required completionAt operational snapshot/,
      )
    })

    it('should disallow completion before completionAt operational instant', () => {
      const futureCompletion = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      const mockBooking = {
        status: BookingStatus.CONFIRMED,
        completionAt: futureCompletion,
      } as BookingAggregate

      const result = BookingPolicy.canComplete(mockBooking)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('TRIP_NOT_ENDED')
    })

    it('should allow completion at or after completionAt operational instant', () => {
      const pastCompletion = new Date(Date.now() - 1000).toISOString()
      const mockBooking = {
        status: BookingStatus.CONFIRMED,
        completionAt: pastCompletion,
      } as BookingAggregate

      const result = BookingPolicy.canComplete(mockBooking)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Payment Window Policy Invariants', () => {
    it('should calculate paymentWindowExpiresAt strictly as createdAt + 15 minutes', () => {
      const createdAt = new Date('2026-08-22T10:00:00.000Z')
      const expiresAt = BookingPolicy.calculatePaymentWindowExpiresAt(createdAt)

      expect(expiresAt.toISOString()).toBe('2026-08-22T10:15:00.000Z')
      expect(expiresAt.getTime() - createdAt.getTime()).toBe(15 * 60 * 1000)
    })

    it('should evaluate isPaymentWindowActive and isPaymentWindowExpired deterministically', () => {
      const expiry = '2026-08-22T10:15:00.000Z'

      // 1 ms before expiry -> Active (true), Expired (false)
      const justBefore = new Date('2026-08-22T10:14:59.999Z')
      expect(BookingPolicy.isPaymentWindowActive(expiry, justBefore)).toBe(true)
      expect(BookingPolicy.isPaymentWindowExpired(expiry, justBefore)).toBe(false)

      // Exact expiry instant -> Active (false), Expired (true)
      const exactExpiry = new Date('2026-08-22T10:15:00.000Z')
      expect(BookingPolicy.isPaymentWindowActive(expiry, exactExpiry)).toBe(false)
      expect(BookingPolicy.isPaymentWindowExpired(expiry, exactExpiry)).toBe(true)

      // 1 ms after expiry -> Active (false), Expired (true)
      const justAfter = new Date('2026-08-22T10:15:00.001Z')
      expect(BookingPolicy.isPaymentWindowActive(expiry, justAfter)).toBe(false)
      expect(BookingPolicy.isPaymentWindowExpired(expiry, justAfter)).toBe(true)
    })

    it('should throw explicit error on invalid paymentWindowExpiresAt timestamp', () => {
      expect(() => BookingPolicy.isPaymentWindowActive('invalid-date', new Date())).toThrowError(
        /Invalid paymentWindowExpiresAt timestamp/,
      )
    })
  })

  describe('isPaymentLate (Decoupled from Capacity Hold)', () => {
    it('should return false when payment completes within payment window', () => {
      const mockBooking = {
        paymentWindowExpiresAt: '2026-08-22T10:15:00.000Z',
        capacityHold: null,
      } as unknown as BookingAggregate

      const paymentTime = '2026-08-22T10:05:00.000Z'
      expect(BookingPolicy.isPaymentLate(mockBooking, paymentTime)).toBe(false)
    })

    it('should return true when payment completes after payment window has expired', () => {
      const mockBooking = {
        paymentWindowExpiresAt: '2026-08-22T10:15:00.000Z',
        capacityHold: null,
      } as unknown as BookingAggregate

      const paymentTime = '2026-08-22T10:15:01.000Z'
      expect(BookingPolicy.isPaymentLate(mockBooking, paymentTime)).toBe(true)
    })

    it('should evaluate payment timeliness solely based on paymentWindowExpiresAt even if capacityHold expired earlier', () => {
      // Inventory hold: 5 mins (10:00 -> 10:05)
      // Payment window: 15 mins (10:00 -> 10:15)
      const mockBooking = {
        paymentWindowExpiresAt: '2026-08-22T10:15:00.000Z',
        capacityHold: {
          holdId: 'hold_1',
          expiresAt: '2026-08-22T10:05:00.000Z',
          status: 'expired',
        },
      } as unknown as BookingAggregate

      // Customer pays at 10:06 (past hold expiry, but WITHIN payment window)
      const paymentTime = '2026-08-22T10:06:00.000Z'
      expect(BookingPolicy.isPaymentLate(mockBooking, paymentTime)).toBe(false)
    })
  })

  describe('canReuseForCheckout (Separation of Capacity vs Payment Window)', () => {
    it('should allow checkout reuse for Daily Tour without capacityHold when paymentWindow is active', () => {
      const mockBooking = {
        id: 702,
        customerId: 1,
        experienceId: 53,
        startDate: '2026-08-25',
        status: BookingStatus.DRAFT,
        capacityHold: null,
        paymentWindowExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      } as unknown as BookingAggregate

      const result = BookingPolicy.canReuseForCheckout(mockBooking, 1, 53, '2026-08-25')
      expect(result.allowed).toBe(true)
    })

    it('should disallow checkout reuse when paymentWindow has expired', () => {
      const mockBooking = {
        id: 702,
        customerId: 1,
        experienceId: 53,
        startDate: '2026-08-25',
        status: BookingStatus.DRAFT,
        capacityHold: null,
        paymentWindowExpiresAt: new Date(Date.now() - 1000).toISOString(),
      } as unknown as BookingAggregate

      const result = BookingPolicy.canReuseForCheckout(mockBooking, 1, 53, '2026-08-25')
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('BOOKING_EXPIRED')
    })

    it('should allow checkout reuse for Package with active capacityHold and active paymentWindow', () => {
      const mockBooking = {
        id: 800,
        customerId: 1,
        experienceId: 10,
        startDate: '2026-09-01',
        status: BookingStatus.PENDING_PAYMENT,
        capacityHold: { status: 'active', expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      } as unknown as BookingAggregate

      const result = BookingPolicy.canReuseForCheckout(mockBooking, 1, 10, '2026-09-01')
      expect(result.allowed).toBe(true)
    })
  })

  describe('Incident #702 Regression Invariant', () => {
    it('guarantees that a slot-less Daily Tour (#53) with no capacityHold remains active and payable throughout its 15-minute window', () => {
      const createdAt = new Date('2026-08-22T13:27:43.136Z')
      const paymentWindowExpiresAt = BookingPolicy.calculatePaymentWindowExpiresAt(createdAt).toISOString()

      // Exact Incident #702 state:
      const incidentBooking = {
        id: 702,
        bookingNumber: 'LBV-260822-64914',
        customerId: 21,
        experienceId: 53,
        startDate: '2026-08-22',
        status: BookingStatus.PENDING_PAYMENT,
        capacityHold: null, // Slot-less Daily Tour
        paymentWindowExpiresAt,
      } as unknown as BookingAggregate

      // 1. Stripe payment occurs 10 seconds after creation (13:27:53.000Z)
      const stripePaymentCompletedAt = '2026-08-22T13:27:53.000Z'
      const paymentNow = new Date(stripePaymentCompletedAt)

      // 2. Invariant: Window MUST be active
      expect(BookingPolicy.isPaymentWindowActive(incidentBooking.paymentWindowExpiresAt, paymentNow)).toBe(true)

      // 3. Invariant: Payment MUST NOT be considered late
      expect(BookingPolicy.isPaymentLate(incidentBooking, stripePaymentCompletedAt)).toBe(false)

      // 4. Invariant: Checkout reuse MUST succeed
      const reuseResult = BookingPolicy.canReuseForCheckout(incidentBooking, 21, 53, '2026-08-22', paymentNow)
      expect(reuseResult.allowed).toBe(true)
    })
  })
})
