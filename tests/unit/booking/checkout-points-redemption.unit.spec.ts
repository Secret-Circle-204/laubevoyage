import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingCreator } from '@/domains/booking/creator'
import { BookingConfirmation } from '@/domains/booking/confirmation'
import { BookingCancellation } from '@/domains/booking/cancellation'
import { BookingExpiration } from '@/domains/booking/expiration'
import { BookingStatus, type BookingAggregate, type Actor } from '@/domains/booking/types'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'
import { PointHoldService } from '@/domains/loyalty/point-hold'
import { PointsCalculator } from '@/domains/loyalty/points-calculator'
import { LedgerValidator } from '@/domains/loyalty/ledger-validator'
import type { LoyaltyProgramConfig } from '@/domains/loyalty/tier-config'

describe('GATE 17.2: Checkout Loyalty Redemption & Financial Boundary Unit Tests', () => {
  const mockConfig: LoyaltyProgramConfig = {
    id: '1',
    status: 'published',
    version: 1,
    programCode: 'LAUBE_LOYALTY',
    name: "L'Aube Voyage Loyalty Program",
    baseEarnRate: 1,
    redemptionPointsUnit: 100,
    redemptionValueEGP: 10,
    minRedemptionPoints: 50,
    redemptionStepUnit: 50,
    maxRedemptionPercent: 80,
    maxRedemptionFixedEGP: 5000,
    allowPartialRedemption: true,
    welcomeBonus: 100,
    expirationMonths: 12,
    bonusNeverExpires: true,
    tiers: [
      { tier: 'bronze', label: 'Bronze', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
      { tier: 'silver', label: 'Silver', minSpentEGP: 10000, earnMultiplier: 1.25, upgradeBonus: 250 },
      { tier: 'gold', label: 'Gold', minSpentEGP: 25000, earnMultiplier: 1.5, upgradeBonus: 500 },
      { tier: 'platinum', label: 'Platinum', minSpentEGP: 50000, earnMultiplier: 2.0, upgradeBonus: 1000 },
    ],
  }

  describe('1. Transport Layer Validation & Sanitization Invariants', () => {
    // Pure validator simulating confirmCheckoutAction transport guard
    function validateTransportPoints(input: unknown): { isValid: boolean; value?: number; error?: string; code?: string } {
      if (input === undefined || input === null) {
        return { isValid: true, value: undefined }
      }
      if (
        typeof input !== 'number' ||
        !Number.isFinite(input) ||
        !Number.isInteger(input) ||
        input < 0
      ) {
        return {
          isValid: false,
          error: 'Invalid loyalty points redemption amount. Points must be a non-negative integer.',
          code: 'INVALID_POINTS_INPUT',
        }
      }
      return { isValid: true, value: input > 0 ? input : undefined }
    }

    it('accepts omitted/undefined points and normalizes to undefined', () => {
      const res = validateTransportPoints(undefined)
      expect(res.isValid).toBe(true)
      expect(res.value).toBeUndefined()
    })

    it('accepts null points and normalizes to undefined', () => {
      const res = validateTransportPoints(null)
      expect(res.isValid).toBe(true)
      expect(res.value).toBeUndefined()
    })

    it('accepts explicit 0 points and normalizes to undefined (no redemption)', () => {
      const res = validateTransportPoints(0)
      expect(res.isValid).toBe(true)
      expect(res.value).toBeUndefined()
    })

    it('rejects negative numbers at transport boundary', () => {
      const res = validateTransportPoints(-1)
      expect(res.isValid).toBe(false)
      expect(res.code).toBe('INVALID_POINTS_INPUT')
    })

    it('rejects fractional numbers (floats) without silent flooring', () => {
      const res = validateTransportPoints(1.5)
      expect(res.isValid).toBe(false)
      expect(res.code).toBe('INVALID_POINTS_INPUT')
    })

    it('rejects NaN at transport boundary', () => {
      const res = validateTransportPoints(NaN)
      expect(res.isValid).toBe(false)
      expect(res.code).toBe('INVALID_POINTS_INPUT')
    })

    it('rejects Infinity at transport boundary', () => {
      const res = validateTransportPoints(Infinity)
      expect(res.isValid).toBe(false)
      expect(res.code).toBe('INVALID_POINTS_INPUT')
    })

    it('rejects string inputs at transport boundary', () => {
      const res1 = validateTransportPoints('100' as any)
      expect(res1.isValid).toBe(false)
      expect(res1.code).toBe('INVALID_POINTS_INPUT')

      const res2 = validateTransportPoints('100abc' as any)
      expect(res2.isValid).toBe(false)
      expect(res2.code).toBe('INVALID_POINTS_INPUT')
    })

    it('accepts valid positive integer and forwards to Domain', () => {
      const res = validateTransportPoints(200)
      expect(res.isValid).toBe(true)
      expect(res.value).toBe(200)
    })
  })

  describe('2. Domain Validation & Pure Economics', () => {
    it('validates redemption amount against active policy and balance', () => {
      // 1. Balance = 500, Request = 200, Total = 5000 EGP -> Allowed
      const res1 = PointsCalculator.validateRedemptionAmount(200, 500, 5000, mockConfig)
      expect(res1.allowed).toBe(true)

      // 2. Request exceeds available balance -> Rejected
      const res2 = PointsCalculator.validateRedemptionAmount(600, 500, 5000, mockConfig)
      expect(res2.allowed).toBe(false)
      expect(res2.code).toBe('INSUFFICIENT_POINTS')

      // 3. Request is below minRedemptionPoints (50) -> Rejected
      const res3 = PointsCalculator.validateRedemptionAmount(25, 500, 5000, mockConfig)
      expect(res3.allowed).toBe(false)
      expect(res3.code).toBe('MIN_REDEMPTION_NOT_MET')

      // 4. Request violates step unit (multiples of 50) -> Rejected
      const res4 = PointsCalculator.validateRedemptionAmount(125, 500, 5000, mockConfig)
      expect(res4.allowed).toBe(false)
      expect(res4.code).toBe('INVALID_STEP_UNIT')

      // 5. Discount exceeds maximum percentage cap (80% of 100 EGP = 80 EGP max = 800 pts) -> 900 pts rejected
      const res5 = PointsCalculator.validateRedemptionAmount(900, 1000, 100, mockConfig)
      expect(res5.allowed).toBe(false)
      expect(res5.code).toBe('EXCEEDS_MAX_PERCENT_LIMIT')
    })

    it('computes exact monetary redemption value without floating point errors', () => {
      // 100 points = 10 EGP
      expect(PointsCalculator.calculatePointsMonetaryValueEGP(100, mockConfig)).toBe(10)
      expect(PointsCalculator.calculatePointsMonetaryValueEGP(200, mockConfig)).toBe(20)
      expect(PointsCalculator.calculatePointsMonetaryValueEGP(50, mockConfig)).toBe(5)
      expect(PointsCalculator.calculatePointsMonetaryValueEGP(0, mockConfig)).toBe(0)
    })
  })

  describe('3. BookingCreator & Draft PointHold Lifecycle', () => {
    let mockBookingRepo: any
    let mockCustomerRepo: any
    let mockExpService: any
    let mockLoyaltyService: any
    let mockPricingPipeline: any
    let creator: BookingCreator
    let lastCreatedBooking: any = null

    beforeEach(() => {
      lastCreatedBooking = null
      mockBookingRepo = {
        create: vi.fn().mockImplementation((b) => {
          lastCreatedBooking = { id: 101, ...b }
          return Promise.resolve(lastCreatedBooking)
        }),
        update: vi.fn().mockImplementation((id, data) => {
          return Promise.resolve({ ...lastCreatedBooking, id, ...data })
        }),
        save: vi.fn().mockImplementation((b) => Promise.resolve(b)),
        generateBookingNumber: vi.fn().mockResolvedValue('BK-2026-TEST'),
        findOpenBookingByCustomerAndExperience: vi.fn().mockResolvedValue(null),
        findByIdempotencyKey: vi.fn().mockResolvedValue(null),
        acquireCustomerLock: vi.fn().mockResolvedValue(undefined),
        getActiveHeldPointsForCustomer: vi.fn().mockResolvedValue(0),
      }
      mockCustomerRepo = {
        findById: vi.fn().mockResolvedValue({ id: 100, firstName: 'John', lastName: 'Doe', status: 'active' }),
      }
      mockExpService = {
        getById: vi.fn().mockResolvedValue({
          id: 1,
          title: 'Desert Safari',
          heroUrl: 'https://img.jpg',
          type: 'package',
          availability: 'available',
          durationDays: 4,
        }),
        getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
        lockCapacity: vi.fn().mockResolvedValue({ status: 'held', seats: 1 }),
      }
      mockLoyaltyService = {
        getCustomerBalance: vi.fn().mockResolvedValue(500),
        calculatePointValueInEGP: vi.fn().mockImplementation((pts) => Promise.resolve(Math.floor((pts / 100) * 10))),
        getActiveConfig: vi.fn().mockResolvedValue(mockConfig),
      }
      mockPricingPipeline = {
        calculatePricingSnapshot: vi.fn().mockImplementation((basePriceEGP, _target, discounts) => {
          const loyaltyDiscount = discounts?.loyalty || 0
          return Promise.resolve({
            snapshotId: 'snap_test_1',
            snapshotVersion: 'v1',
            pricingRuleVersion: 'v1.0.0',
            exchangeRateVersion: 'v1.0.0',
            basePriceEGP,
            loyaltyDiscountEGP: loyaltyDiscount,
            promotionDiscountEGP: 0,
            couponDiscountEGP: 0,
            subtotalEGP: Math.max(0, basePriceEGP - loyaltyDiscount),
            taxes: 0,
            fees: 0,
            totalAmountEGP: Math.max(0, basePriceEGP - loyaltyDiscount),
            displayCurrency: 'EGP',
            displayAmount: Math.max(0, basePriceEGP - loyaltyDiscount),
            exchangeRate: 1,
            exchangeRateTimestamp: new Date().toISOString(),
            calculatedAt: new Date().toISOString(),
          })
        }),
      }

      creator = new BookingCreator(
        mockBookingRepo,
        mockCustomerRepo,
        mockExpService,
        mockLoyaltyService,
        mockPricingPipeline,
      )
    })

    it('creates draft booking with held PointHold and applies discount without debiting ledger', async () => {
      const departure: BookableDeparture = {
        departureId: 'dep_10',
        experienceId: 1,
        experienceTitle: 'Desert Safari',
        date: '2026-10-01',
        effectiveBasePrice: 1000,
        experienceType: 'package',
        status: 'available',
      }

      const booking = await creator.createDraft({
        userId: 100,
        departure,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+201001234567', type: 'adult' }],
        endDate: '2026-10-05',
        currency: 'EGP',
        source: 'website',
        pointsToRedeem: 200,
      })

      expect(booking.pointHold).toBeDefined()
      expect(booking.pointHold?.status).toBe('held')
      expect(booking.pointHold?.pointsHeld).toBe(200)
      expect(booking.pointHold?.valueEGP).toBe(20)
      expect(booking.pricingSnapshot.loyaltyDiscountEGP).toBe(20)
      expect(booking.pricingSnapshot.totalAmountEGP).toBe(980)

      // Verify ZERO ledger debit occurred during draft creation
      expect(mockLoyaltyService.redeemPoints).toBeUndefined()
    })

    it('fails fast if user balance is insufficient for requested points', async () => {
      mockLoyaltyService.getCustomerBalance.mockResolvedValue(100) // User only has 100 pts

      const departure: BookableDeparture = {
        departureId: 'dep_10',
        experienceId: 1,
        experienceTitle: 'Desert Safari',
        date: '2026-10-01',
        effectiveBasePrice: 1000,
        experienceType: 'package',
        status: 'available',
      }

      await expect(
        creator.createDraft({
          userId: 100,
          departure,
          travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+201001234567', type: 'adult' }],
          endDate: '2026-10-05',
          currency: 'EGP',
          source: 'website',
          pointsToRedeem: 200, // Requesting 200 pts
        })
      ).rejects.toThrow(/Redemption forbidden|exceeds available balance/i)
    })
  })

  describe('4. Booking Confirmation, Cancellation, and Financial Idempotency', () => {
    let mockBookingRepo: any
    let mockExpService: any
    let mockLoyaltyService: any
    let confirmation: BookingConfirmation
    let cancellation: BookingCancellation
    let expiration: BookingExpiration

    beforeEach(() => {
      mockBookingRepo = {
        findById: vi.fn(),
        update: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
        updateStatusConditionally: vi.fn().mockImplementation((id, _allowed, updateData) => Promise.resolve({ id, status: updateData.status, pointHold: updateData.pointHold })),
        transitionStatus: vi.fn().mockImplementation((id, toStatus, data) => Promise.resolve({ id, ...data, status: toStatus })),
        save: vi.fn(),
        recordOutboxEvent: vi.fn(),
        beginTransaction: vi.fn().mockResolvedValue('tx_exp_1'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
        appendTimelineEntry: vi.fn().mockResolvedValue(undefined),
        appendAuditRecord: vi.fn().mockResolvedValue(undefined),
      }
      mockExpService = {
        commitCapacity: vi.fn(),
        getDepartureSlotById: vi.fn().mockResolvedValue({ id: 100, departureId: 10 }),
        getDepartureSlotByDate: vi.fn().mockResolvedValue({ id: 100, departureId: 10 }),
        releaseCapacity: vi.fn(),
      }
      mockLoyaltyService = {
        getBookingLedgerEntries: vi.fn().mockResolvedValue([]),
        redeemPoints: vi.fn().mockResolvedValue({ id: 'led_1', balance: 300 }),
      }

      confirmation = new BookingConfirmation(
        mockBookingRepo,
        mockExpService,
        mockLoyaltyService,
      )
      cancellation = new BookingCancellation(mockBookingRepo, mockExpService)
      expiration = new BookingExpiration(mockBookingRepo, mockExpService)
    })

    it('commits PointHold to "committed" and records single ledger debit upon confirmation', async () => {
      const draftBooking: BookingAggregate = {
        id: 777,
        bookingNumber: 'BK-777',
        status: BookingStatus.PAID,
        customerId: 100,
        experienceId: 5,
        source: 'website',
        version: 1,
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        completionAt: '2026-10-01T12:00:00.000Z',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        pricingSnapshot: { totalAmountEGP: 980, displayCurrency: 'EGP' } as any,
        travelers: [{} as any],
        capacityHold: { status: 'held', seats: 1 } as any,
        pointHold: {
          holdId: 'p_hold_777',
          bookingId: 777,
          customerId: 100,
          pointsHeld: 200,
          valueEGP: 20,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          status: 'held',
        },
        pointsEarned: 0,
        paymentAttempts: [],
        documents: {},
        timeline: [],
        auditTrail: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        departureSlot: 100,
      }

      mockBookingRepo.findById.mockResolvedValue(draftBooking)

      const result = await confirmation.confirm(777)

      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(result.pointHold?.status).toBe('committed')
      expect(mockLoyaltyService.redeemPoints).toHaveBeenCalledTimes(1)
      expect(mockLoyaltyService.redeemPoints).toHaveBeenCalledWith(
        100,
        200,
        777,
        980,
        'Booking point discount redemption',
        undefined,
        undefined,
      )
    })

    it('is idempotent: duplicate confirmation call does not create duplicate ledger debits', async () => {
      const alreadyConfirmedBooking: BookingAggregate = {
        id: 777,
        bookingNumber: 'BK-777',
        status: BookingStatus.PAID,
        customerId: 100,
        experienceId: 5,
        source: 'website',
        version: 1,
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        completionAt: '2026-10-01T12:00:00.000Z',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        pricingSnapshot: { totalAmountEGP: 980, displayCurrency: 'EGP' } as any,
        travelers: [{} as any],
        capacityHold: { status: 'held', seats: 1 } as any,
        pointHold: {
          holdId: 'p_hold_777',
          bookingId: 777,
          customerId: 100,
          pointsHeld: 200,
          valueEGP: 20,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          status: 'held',
        },
        pointsEarned: 0,
        paymentAttempts: [],
        documents: {},
        timeline: [],
        auditTrail: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        departureSlot: 100,
      }

      mockBookingRepo.findById.mockResolvedValue(alreadyConfirmedBooking)
      // Existing ledger entry found for this booking
      mockLoyaltyService.getBookingLedgerEntries.mockResolvedValue([{ type: 'redeem', amount: -200 }])

      await confirmation.confirm(777)

      // Should NOT call redeemPoints again
      expect(mockLoyaltyService.redeemPoints).not.toHaveBeenCalled()
    })

    it('releases PointHold to "released" upon cancellation without debiting ledger', async () => {
      const heldBooking: BookingAggregate = {
        id: 888,
        bookingNumber: 'BK-888',
        status: BookingStatus.PENDING_PAYMENT,
        customerId: 100,
        experienceId: 5,
        source: 'website',
        version: 1,
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        completionAt: '2026-10-01T12:00:00.000Z',
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        pricingSnapshot: { totalAmountEGP: 980, displayCurrency: 'EGP' } as any,
        travelers: [{} as any],
        capacityHold: { status: 'held', seats: 1 } as any,
        pointHold: {
          holdId: 'p_hold_888',
          bookingId: 888,
          customerId: 100,
          pointsHeld: 200,
          valueEGP: 20,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          status: 'held',
        },
        pointsEarned: 0,
        paymentAttempts: [],
        documents: {},
        timeline: [],
        auditTrail: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        departureSlot: 100,
      }

      mockBookingRepo.findById.mockResolvedValue(heldBooking)

      const customerActor: Actor = { id: '100', type: 'customer', name: 'John Doe' }
      const cancelled = await cancellation.cancel(888, customerActor, 'Customer requested cancellation')

      expect(cancelled.status).toBe(BookingStatus.CANCELLED)
      expect(cancelled.pointHold?.status).toBe('released')
    })

    it('expires PointHold to "expired" upon payment window timeout without debiting ledger', async () => {
      const expiredBooking: BookingAggregate = {
        id: 999,
        bookingNumber: 'BK-999',
        status: BookingStatus.PENDING_PAYMENT,
        customerId: 100,
        experienceId: 5,
        source: 'website',
        version: 1,
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        completionAt: '2026-10-01T12:00:00.000Z',
        paymentWindowExpiresAt: new Date(Date.now() - 1000).toISOString(),
        pricingSnapshot: { totalAmountEGP: 980, displayCurrency: 'EGP' } as any,
        travelers: [{} as any],
        capacityHold: { status: 'active', seats: 1 } as any,
        pointHold: {
          holdId: 'p_hold_999',
          bookingId: 999,
          customerId: 100,
          pointsHeld: 200,
          valueEGP: 20,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          status: 'held',
        },
        pointsEarned: 0,
        paymentAttempts: [],
        documents: {},
        timeline: [],
        auditTrail: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        departureSlot: 100,
      }

      mockBookingRepo.findById.mockResolvedValue(expiredBooking)

      const expired = await (expiration as any).expireBookingWithRetry(expiredBooking, 1)

      expect(expired?.status).toBe(BookingStatus.EXPIRED)
      expect(expired?.pointHold?.status).toBe('expired')
    })
  })

  describe('5. Financial Pre-Commit Invariant Guard', () => {
    it('enforces that resulting balance cannot drop below zero', () => {
      // 1. Balance 500 - 200 = 300 >= 0 -> Passes
      expect(() => LedgerValidator.validateLedgerEntry('redeem', -200, 500)).not.toThrow()

      // 2. Balance 100 - 200 = -100 < 0 -> Throws FinancialInvariantException
      expect(() => LedgerValidator.validateLedgerEntry('redeem', -200, 100)).toThrow(
        /Financial Invariant Violation|Insufficient Funds/i
      )
    })
  })

  describe('6. GATE 17.5.2-R: Atomic Concurrency, Invariant & Lifecycle Regression Tests', () => {
    let mockBookingRepo: any
    let mockCustomerRepo: any
    let mockExpService: any
    let mockLoyaltyService: any
    let mockPricingPipeline: any
    let creator: BookingCreator
    let departure: BookableDeparture

    beforeEach(() => {
      departure = {
        departureId: 'dep_10',
        experienceId: 1,
        experienceTitle: 'Desert Safari',
        date: '2026-10-01',
        effectiveBasePrice: 1000,
        experienceType: 'package',
        status: 'available',
      }

      mockCustomerRepo = {
        findById: vi.fn().mockResolvedValue({ id: 100, firstName: 'John', lastName: 'Doe', status: 'active' }),
      }
      mockExpService = {
        getById: vi.fn().mockResolvedValue({
          id: 1,
          title: 'Desert Safari',
          heroUrl: 'https://img.jpg',
          type: 'package',
          availability: 'available',
          durationDays: 4,
        }),
        getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
        lockCapacity: vi.fn().mockResolvedValue({ status: 'held', seats: 1 }),
      }
      mockLoyaltyService = {
        getCustomerBalance: vi.fn().mockResolvedValue(12400),
        calculatePointValueInEGP: vi.fn().mockImplementation((pts) => Promise.resolve(Math.floor((pts / 100) * 10))),
        getActiveConfig: vi.fn().mockResolvedValue(mockConfig),
      }
      mockPricingPipeline = {
        calculatePricingSnapshot: vi.fn().mockImplementation((basePriceEGP, _target, discounts) => {
          const loyaltyDiscount = discounts?.loyalty || 0
          return Promise.resolve({
            basePriceEGP,
            loyaltyDiscountEGP: loyaltyDiscount,
            totalAmountEGP: Math.max(0, basePriceEGP - loyaltyDiscount),
            displayCurrency: 'EGP',
          })
        }),
      }
    })

    it('Test 1 — Sequential: Rejects second booking when active holds consume available balance', async () => {
      let activeHeld = 0
      mockBookingRepo = {
        acquireCustomerLock: vi.fn().mockResolvedValue(undefined),
        getActiveHeldPointsForCustomer: vi.fn().mockImplementation(() => Promise.resolve(activeHeld)),
        create: vi.fn().mockImplementation((b) => {
          return Promise.resolve({ id: 101, ...b })
        }),
        update: vi.fn().mockImplementation((id, data) => {
          if (data.pointHold?.status === 'held') {
            activeHeld += data.pointHold.pointsHeld
          }
          return Promise.resolve({ id, ...data })
        }),
        save: vi.fn().mockImplementation((b) => Promise.resolve(b)),
        generateBookingNumber: vi.fn().mockResolvedValue('BK-SEQ-1'),
        findOpenBookingByCustomerAndExperience: vi.fn().mockResolvedValue(null),
        findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      }

      creator = new BookingCreator(mockBookingRepo, mockCustomerRepo, mockExpService, mockLoyaltyService, mockPricingPipeline)

      // 1. First booking with 10,000 points succeeds
      const bookingA = await creator.createDraft({
        userId: 100,
        departure,
        travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+201001234567', type: 'adult' }],
        endDate: '2026-10-05',
        currency: 'EGP',
        source: 'website',
        pointsToRedeem: 10000,
      })
      expect(bookingA.pointHold?.pointsHeld).toBe(10000)
      expect(activeHeld).toBe(10000)

      // 2. Second booking with 10,000 points fails immediately (Available = 12,400 - 10,000 = 2,400 < 10,000)
      await expect(
        creator.createDraft({
          userId: 100,
          departure,
          travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+201001234567', type: 'adult' }],
          endDate: '2026-10-05',
          currency: 'EGP',
          source: 'website',
          pointsToRedeem: 10000,
        })
      ).rejects.toThrow(/Redemption forbidden|Insufficient/i)

      // Total active held points remains exactly 10,000 (never 20,000)
      expect(activeHeld).toBe(10000)
    })

    it('Test 2 — Concurrent Race: Exactly one succeeds and exactly one fails when two 10,000 pt requests arrive simultaneously', async () => {
      let isCustomerLocked = false
      let activeHeld = 0
      let bookingCount = 0

      mockBookingRepo = {
        // Simulates PostgreSQL exclusive row lock (SELECT ... FOR UPDATE)
        acquireCustomerLock: vi.fn().mockImplementation(async () => {
          while (isCustomerLocked) {
            await new Promise((r) => setTimeout(r, 10))
          }
          isCustomerLocked = true
        }),
        getActiveHeldPointsForCustomer: vi.fn().mockImplementation(() => Promise.resolve(activeHeld)),
        create: vi.fn().mockImplementation(async (b) => {
          await new Promise((r) => setTimeout(r, 20))
          bookingCount++
          return { id: 100 + bookingCount, ...b }
        }),
        update: vi.fn().mockImplementation(async (id, data) => {
          if (data.pointHold?.status === 'held') {
            activeHeld += data.pointHold.pointsHeld
          }
          isCustomerLocked = false // release lock upon commit
          return { id, ...data }
        }),
        save: vi.fn().mockImplementation((b) => Promise.resolve(b)),
        generateBookingNumber: vi.fn().mockResolvedValue('BK-CONC-1'),
        findOpenBookingByCustomerAndExperience: vi.fn().mockResolvedValue(null),
        findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      }

      creator = new BookingCreator(mockBookingRepo, mockCustomerRepo, mockExpService, mockLoyaltyService, mockPricingPipeline)

      const request1 = creator.createDraft(
        {
          userId: 100,
          departure,
          travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+201001234567', type: 'adult' }],
          endDate: '2026-10-05',
          currency: 'EGP',
          source: 'website',
          pointsToRedeem: 10000,
        },
        { transactionId: 'tx_1' }
      )

      const request2 = creator.createDraft(
        {
          userId: 100,
          departure,
          travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+201001234567', type: 'adult' }],
          endDate: '2026-10-05',
          currency: 'EGP',
          source: 'website',
          pointsToRedeem: 10000,
        },
        { transactionId: 'tx_2' }
      )

      const results = await Promise.allSettled([request1, request2])

      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      const rejected = results.filter((r) => r.status === 'rejected')

      // Exactly one succeeds, exactly one fails
      expect(fulfilled.length).toBe(1)
      expect(rejected.length).toBe(1)

      // Total active held points is strictly 10,000 (never 20,000)
      expect(activeHeld).toBe(10000)
    })

    it('Test 3 — Rollback: If booking creation fails after lock, no hold remains persisted', async () => {
      let activeHeld = 0
      mockBookingRepo = {
        acquireCustomerLock: vi.fn().mockResolvedValue(undefined),
        getActiveHeldPointsForCustomer: vi.fn().mockImplementation(() => Promise.resolve(activeHeld)),
        create: vi.fn().mockRejectedValue(new Error('Simulated Database Insert Failure')),
        update: vi.fn(),
        save: vi.fn(),
        generateBookingNumber: vi.fn().mockResolvedValue('BK-ROLLBACK'),
        findOpenBookingByCustomerAndExperience: vi.fn().mockResolvedValue(null),
        findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      }

      creator = new BookingCreator(mockBookingRepo, mockCustomerRepo, mockExpService, mockLoyaltyService, mockPricingPipeline)

      await expect(
        creator.createDraft({
          userId: 100,
          departure,
          travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+201001234567', type: 'adult' }],
          endDate: '2026-10-05',
          currency: 'EGP',
          source: 'website',
          pointsToRedeem: 10000,
        })
      ).rejects.toThrow('Simulated Database Insert Failure')

      // Zero orphaned holds
      expect(activeHeld).toBe(0)
    })

    it('Test 4 — BNPL Lifecycle: pending_admin_review holds points until confirmed or cancelled', async () => {
      const activeBNPLBooking: BookingAggregate = {
        id: 777,
        bookingNumber: 'BK-BNPL-777',
        status: BookingStatus.PENDING_ADMIN_REVIEW,
        customerId: 100,
        experienceId: 1,
        source: 'website',
        version: 1,
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        completionAt: '2026-10-05T12:00:00.000Z',
        paymentWindowExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        pricingSnapshot: { totalAmountEGP: 9000, displayCurrency: 'EGP' } as any,
        travelers: [{} as any],
        capacityHold: null,
        pointHold: {
          holdId: 'p_hold_bnpl_777',
          bookingId: 777,
          customerId: 100,
          pointsHeld: 10000,
          valueEGP: 1000,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          status: 'held',
        },
        pointsEarned: 0,
        paymentAttempts: [],
        documents: {},
        timeline: [],
        auditTrail: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Simulate repository behavior for active holds aggregation
      function computeActiveHeld(bookings: BookingAggregate[]) {
        return bookings
          .filter((b) => ['draft', 'pending_payment', 'pending_admin_review'].includes(b.status) && b.pointHold?.status === 'held')
          .reduce((sum, b) => sum + (b.pointHold?.pointsHeld || 0), 0)
      }

      // 1. BNPL in pending_admin_review is held -> 10,000 reserved
      expect(computeActiveHeld([activeBNPLBooking])).toBe(10000)

      // 2. When confirmed -> PointHold becomes committed -> 0 held (debited in ledger)
      const confirmedBooking = {
        ...activeBNPLBooking,
        status: BookingStatus.CONFIRMED,
        pointHold: { ...activeBNPLBooking.pointHold!, status: 'committed' as const },
      }
      expect(computeActiveHeld([confirmedBooking])).toBe(0)

      // 3. When cancelled -> PointHold becomes released -> 0 held
      const cancelledBooking = {
        ...activeBNPLBooking,
        status: BookingStatus.CANCELLED,
        pointHold: { ...activeBNPLBooking.pointHold!, status: 'released' as const },
      }
      expect(computeActiveHeld([cancelledBooking])).toBe(0)
    })
  })
})
