import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingStatus, type BookingAggregate } from '@/domains/booking/types'
import { BookingPolicy } from '@/domains/booking/policy'
import { BookingConfirmation } from '@/domains/booking/confirmation'
import { BookingRepository } from '@/domains/booking/repository'
import { WebhookProcessor } from '@/domains/payment/webhook-processor'
import { PaymentPolicy } from '@/domains/payment/policy'

describe('Phase P0-E: Expiration, Capacity & Financial Isolation Invariants', () => {
  describe('1. Expiration Engine SSOT & TTL Decoupling Invariants', () => {
    it('Daily Tour without capacityHold remains active when payment window is active (now < createdAt + 15m)', () => {
      const now = new Date('2026-08-22T10:05:00.000Z')
      const paymentWindowExpiresAt = '2026-08-22T10:15:00.000Z' // 10 minutes left

      const isActive = BookingPolicy.isPaymentWindowActive(paymentWindowExpiresAt, now)
      const isExpired = BookingPolicy.isPaymentWindowExpired(paymentWindowExpiresAt, now)

      expect(isActive).toBe(true)
      expect(isExpired).toBe(false)
    })

    it('Daily Tour without capacityHold expires when payment window expires (now >= createdAt + 15m)', () => {
      const now = new Date('2026-08-22T10:15:00.000Z') // Exactly at expiry
      const paymentWindowExpiresAt = '2026-08-22T10:15:00.000Z'

      const isActive = BookingPolicy.isPaymentWindowActive(paymentWindowExpiresAt, now)
      const isExpired = BookingPolicy.isPaymentWindowExpired(paymentWindowExpiresAt, now)

      expect(isActive).toBe(false)
      expect(isExpired).toBe(true)
    })

    it('Fixed Package with active capacity hold and active payment window can be reused for checkout', () => {
      const now = new Date('2026-08-22T10:04:00.000Z')
      const draftBooking: BookingAggregate = {
        id: 101,
        bookingNumber: 'LBV-260822-101',
        status: BookingStatus.DRAFT,
        customerId: 5,
        experienceId: 20,
        departureSlot: 42,
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        completionAt: '2026-09-05T18:00:00.000Z',
        paymentWindowExpiresAt: '2026-08-22T10:15:00.000Z', // 15m TTL
        pricingSnapshot: { basePriceEGP: 2000, displayCurrency: 'EGP', displayAmount: 2000 } as any,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+123' }],
        capacityHold: {
          holdId: 'hold_101',
          bookingId: 101,
          customerId: 5,
          experienceId: 20,
          departureId: 'DEP-20-0901',
          seats: 1,
          date: '2026-09-01',
          createdAt: '2026-08-22T10:00:00.000Z',
          expiresAt: '2026-08-22T10:05:00.000Z', // 5m hold TTL
          status: 'active',
        },
        pointHold: null,
        pointsEarned: 0,
        paymentAttempts: [],
        timeline: [],
        auditTrail: [],
        documents: {},
        version: 1,
        source: 'website',
        createdAt: '2026-08-22T10:00:00.000Z',
        updatedAt: '2026-08-22T10:00:00.000Z',
      }

      const reuseCheck = BookingPolicy.canReuseForCheckout(draftBooking, 5, 20, '2026-09-01', now)
      expect(reuseCheck.allowed).toBe(true)
    })

    it('Payment window expired blocks reuse even if capacity hold is theoretically active', () => {
      const now = new Date('2026-08-22T10:16:00.000Z')
      const draftBooking: BookingAggregate = {
        id: 102,
        bookingNumber: 'LBV-260822-102',
        status: BookingStatus.DRAFT,
        customerId: 5,
        experienceId: 20,
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        completionAt: '2026-09-05T18:00:00.000Z',
        paymentWindowExpiresAt: '2026-08-22T10:15:00.000Z', // Expired 1 min ago
        pricingSnapshot: { basePriceEGP: 2000, displayCurrency: 'EGP', displayAmount: 2000 } as any,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+123' }],
        capacityHold: {
          holdId: 'hold_102',
          bookingId: 102,
          customerId: 5,
          experienceId: 20,
          seats: 1,
          date: '2026-09-01',
          createdAt: '2026-08-22T10:00:00.000Z',
          expiresAt: '2026-08-22T10:20:00.000Z',
          status: 'active',
        },
        pointHold: null,
        pointsEarned: 0,
        paymentAttempts: [],
        timeline: [],
        auditTrail: [],
        documents: {},
        version: 1,
        source: 'website',
        createdAt: '2026-08-22T10:00:00.000Z',
        updatedAt: '2026-08-22T10:00:00.000Z',
      }

      const reuseCheck = BookingPolicy.canReuseForCheckout(draftBooking, 5, 20, '2026-09-01', now)
      expect(reuseCheck.allowed).toBe(false)
      expect(reuseCheck.code).toBe('BOOKING_EXPIRED')
    })
  })

  describe('2. Capacity Commit & Traveler Count Integrity', () => {
    let mockRepo: any
    let mockExpService: any
    let confirmation: BookingConfirmation

    beforeEach(() => {
      mockRepo = {
        findById: vi.fn(),
        update: vi.fn().mockImplementation(async (id: number, data: any) => ({ id, ...data })),
      }
      mockExpService = {
        commitCapacity: vi.fn(),
        getDepartureSlotById: vi.fn(),
      }
      confirmation = new BookingConfirmation(mockRepo, mockExpService)
    })

    it('BookingConfirmation.confirm strictly rejects confirmation if traveler array is empty and capacityHold is missing (no fallback to 1)', async () => {
      const invalidBooking: BookingAggregate = {
        id: 201,
        bookingNumber: 'LBV-260822-201',
        status: BookingStatus.PAID,
        customerId: 12,
        experienceId: 30,
        departureSlot: 55,
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        completionAt: '2026-10-05T18:00:00.000Z',
        paymentWindowExpiresAt: '2026-08-22T12:00:00.000Z',
        pricingSnapshot: { basePriceEGP: 1000, displayCurrency: 'EGP', displayAmount: 1000 } as any,
        travelers: [], // Empty travelers array!
        capacityHold: null,
        pointHold: null,
        pointsEarned: 0,
        paymentAttempts: [],
        timeline: [],
        auditTrail: [],
        documents: {},
        version: 1,
        source: 'website',
        createdAt: '2026-08-22T10:00:00.000Z',
        updatedAt: '2026-08-22T10:00:00.000Z',
      }

      mockRepo.findById.mockResolvedValue(invalidBooking)
      mockExpService.getDepartureSlotById.mockResolvedValue({
        id: 55,
        departureId: 'DEP-30-1001',
        experienceId: 30,
        capacityAvailable: 10,
      })

      await expect(confirmation.confirm(201)).rejects.toThrow(
        /Cannot confirm Booking #201 without valid traveler count/i
      )
    })
  })

  describe('3. Financial Separation & Idempotency Invariants', () => {
    it('PaymentPolicy.canProcessWebhook rejects duplicate webhook events idempotently', () => {
      const firstArrival = PaymentPolicy.canProcessWebhook(false)
      expect(firstArrival.allowed).toBe(true)

      const duplicateArrival = PaymentPolicy.canProcessWebhook(true)
      expect(duplicateArrival.allowed).toBe(false)
      expect(duplicateArrival.reason).toContain('already been processed')
    })
  })
})
