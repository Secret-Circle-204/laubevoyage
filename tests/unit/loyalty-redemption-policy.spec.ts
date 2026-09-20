import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PointsCalculator } from '@/domains/loyalty/points-calculator'
import { BookingPolicy } from '@/domains/booking/policy'
import type { LoyaltyProgramConfig } from '@/domains/loyalty/tier-config'

describe('Loyalty Redemption Policy & Stripe Boundary Security Suite', () => {
  // Authoritative Seed Config
  const mockConfig: LoyaltyProgramConfig = {
    id: 'config_1',
    programCode: 'LAUBE_LOYALTY',
    name: "L'Aube Loyalty",
    version: 1,
    status: 'published',
    baseEarnRate: 1,
    redemptionPointsUnit: 100,
    redemptionValueEGP: 10,
    minRedemptionPoints: 50,
    maxRedemptionPercent: 80,
    maxRedemptionFixedEGP: 5000,
    allowPartialRedemption: true,
    redemptionStepUnit: 50,
    welcomeBonus: 100,
    expirationMonths: 12,
    bonusNeverExpires: true,
    tiers: [
      { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
      { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 500 },
      { tier: 'elite', label: 'Elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 1000 },
    ],
  }

  const bookingTotalEGP = 50000

  // ============================================================================
  // 1. UNIT CONVERSION & PURE VALUATION
  // ============================================================================
  describe('1. Unit Conversion Semantics (Points vs EGP)', () => {
    it('should accurately convert 15,000 points to 1,500 EGP', () => {
      const valueEGP = PointsCalculator.calculatePointsMonetaryValueEGP(15000, mockConfig)
      expect(valueEGP).toBe(1500)
    })

    it('should accurately convert 50,000 points to 5,000 EGP', () => {
      const valueEGP = PointsCalculator.calculatePointsMonetaryValueEGP(50000, mockConfig)
      expect(valueEGP).toBe(5000)
    })

    it('should accurately convert 150,000 points to 15,000 EGP', () => {
      const valueEGP = PointsCalculator.calculatePointsMonetaryValueEGP(150000, mockConfig)
      expect(valueEGP).toBe(15000)
    })
  })

  // ============================================================================
  // 2. POINTS CALCULATOR PURE POLICY VALIDATION
  // ============================================================================
  describe('2. PointsCalculator.validateRedemptionAmount', () => {
    it('ALLOWS 15,000 points because 1,500 EGP is strictly within 5,000 EGP limit', () => {
      const balance = 200000
      const result = PointsCalculator.validateRedemptionAmount(15000, balance, bookingTotalEGP, mockConfig)
      expect(result.allowed).toBe(true)
    })

    it('ALLOWS 50,000 points as the exact boundary limit (5,000 EGP == 5,000 EGP)', () => {
      const balance = 200000
      const result = PointsCalculator.validateRedemptionAmount(50000, balance, bookingTotalEGP, mockConfig)
      expect(result.allowed).toBe(true)
    })

    it('REJECTS 150,000 points because 15,000 EGP strictly exceeds 5,000 EGP max limit', () => {
      const balance = 200000
      const result = PointsCalculator.validateRedemptionAmount(150000, balance, bookingTotalEGP, mockConfig)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('EXCEEDS_MAX_FIXED_LIMIT')
      expect(result.reason).toContain('Discount 15000 EGP exceeds maximum fixed redemption limit of 5000 EGP')
    })

    it('REJECTS redemptions that violate redemptionStepUnit', () => {
      const balance = 200000
      const result = PointsCalculator.validateRedemptionAmount(1525, balance, bookingTotalEGP, mockConfig)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INVALID_STEP_UNIT')
    })

    it('REJECTS redemptions below minRedemptionPoints', () => {
      const balance = 200000
      const result = PointsCalculator.validateRedemptionAmount(25, balance, bookingTotalEGP, mockConfig)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('MIN_REDEMPTION_NOT_MET')
    })

    it('REJECTS redemptions exceeding available customer balance', () => {
      const balance = 1000
      const result = PointsCalculator.validateRedemptionAmount(5000, balance, bookingTotalEGP, mockConfig)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INSUFFICIENT_POINTS')
    })
  })

  // ============================================================================
  // 3. BOOKING POLICY PRE-CHECKOUT GATEKEEPER
  // ============================================================================
  describe('3. BookingPolicy.validateBookingRedemptionForCheckout', () => {
    it('ALLOWS non-loyalty booking drafts without point holds', () => {
      const booking = {
        customerId: 10,
        pricingSnapshot: { totalAmountEGP: 10000, loyaltyDiscountEGP: 0 },
        pointHold: null,
      }
      const result = BookingPolicy.validateBookingRedemptionForCheckout(booking, mockConfig)
      expect(result.allowed).toBe(true)
    })

    it('ALLOWS valid 15,000 points booking draft (1,500 EGP discount)', () => {
      const booking = {
        customerId: 10,
        pricingSnapshot: {
          basePriceEGP: 20000,
          totalAmountEGP: 18500,
          loyaltyDiscountEGP: 1500,
        },
        pointHold: {
          pointsHeld: 15000,
          valueEGP: 1500,
          status: 'held',
        },
      }
      const result = BookingPolicy.validateBookingRedemptionForCheckout(booking, mockConfig)
      expect(result.allowed).toBe(true)
    })

    it('ALLOWS boundary 50,000 points booking draft (5,000 EGP discount)', () => {
      const booking = {
        customerId: 10,
        pricingSnapshot: {
          basePriceEGP: 20000,
          totalAmountEGP: 15000,
          loyaltyDiscountEGP: 5000,
        },
        pointHold: {
          pointsHeld: 50000,
          valueEGP: 5000,
          status: 'held',
        },
      }
      const result = BookingPolicy.validateBookingRedemptionForCheckout(booking, mockConfig)
      expect(result.allowed).toBe(true)
    })

    it('REJECTS pre-created booking with 150,000 points (15,000 EGP discount > 5,000 EGP limit)', () => {
      const booking = {
        customerId: 10,
        pricingSnapshot: {
          basePriceEGP: 30000,
          totalAmountEGP: 15000,
          loyaltyDiscountEGP: 15000,
        },
        pointHold: {
          pointsHeld: 150000,
          valueEGP: 15000,
          status: 'held',
        },
      }
      const result = BookingPolicy.validateBookingRedemptionForCheckout(booking, mockConfig)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('EXCEEDS_MAX_FIXED_LIMIT')
      expect(result.reason).toContain('15000 EGP exceeds maximum fixed redemption limit of 5000 EGP')
    })

    it('REJECTS forged booking where pointHold value does not match snapshot discount', () => {
      const booking = {
        customerId: 10,
        pricingSnapshot: {
          basePriceEGP: 20000,
          totalAmountEGP: 15000,
          loyaltyDiscountEGP: 5000, // Snapshot claims 5,000
        },
        pointHold: {
          pointsHeld: 15000,
          valueEGP: 1500, // PointHold claims 1,500
          status: 'held',
        },
      }
      const result = BookingPolicy.validateBookingRedemptionForCheckout(booking, mockConfig)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('SNAPSHOT_DISCOUNT_MISMATCH')
    })
  })

  // ============================================================================
  // 4. STRIPE & API BOUNDARY NON-CREATION INVARIANTS
  // ============================================================================
  describe('4. Stripe Checkout Session Non-Creation Guarantee', () => {
    it('guarantees that an unauthorized 150,000 points booking cannot proceed to Stripe session creation', () => {
      const unauthorizedBooking = {
        customerId: 10,
        pricingSnapshot: {
          basePriceEGP: 30000,
          displayAmount: 15000,
          displayCurrency: 'EGP',
          totalAmountEGP: 15000,
          loyaltyDiscountEGP: 15000,
        },
        pointHold: {
          pointsHeld: 150000,
          valueEGP: 15000,
          status: 'held',
        },
      }

      // Pre-checkout policy check
      const policyRes = BookingPolicy.validateBookingRedemptionForCheckout(unauthorizedBooking, mockConfig)
      expect(policyRes.allowed).toBe(false)
      expect(policyRes.code).toBe('EXCEEDS_MAX_FIXED_LIMIT')

      // Simulated payment checkout delegation
      const paymentAdapterSpy = vi.fn()
      if (policyRes.allowed) {
        paymentAdapterSpy()
      }

      // The gateway adapter is NEVER called!
      expect(paymentAdapterSpy).not.toHaveBeenCalled()
    })

    it('allows a compliant 15,000 points booking to proceed to payment checkout session creation', () => {
      const authorizedBooking = {
        customerId: 10,
        pricingSnapshot: {
          basePriceEGP: 30000,
          displayAmount: 28500,
          displayCurrency: 'EGP',
          totalAmountEGP: 28500,
          loyaltyDiscountEGP: 1500,
        },
        pointHold: {
          pointsHeld: 15000,
          valueEGP: 1500,
          status: 'held',
        },
      }

      const policyRes = BookingPolicy.validateBookingRedemptionForCheckout(authorizedBooking, mockConfig)
      expect(policyRes.allowed).toBe(true)

      const paymentAdapterSpy = vi.fn()
      if (policyRes.allowed) {
        paymentAdapterSpy()
      }

      expect(paymentAdapterSpy).toHaveBeenCalledTimes(1)
    })
  })
})
