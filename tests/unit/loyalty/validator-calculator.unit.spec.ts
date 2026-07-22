import { describe, it, expect } from 'vitest'
import { LedgerValidator } from '@/domains/loyalty/ledger-validator'
import { PointsCalculator } from '@/domains/loyalty/points-calculator'
import { LoyaltyTier } from '@/types'

describe('Loyalty Domain: Ledger Validator & Points Calculator Unit Tests', () => {
  describe('LedgerValidator', () => {
    it('should reject positive points for redeem/reverse/expiration entries', () => {
      expect(() => LedgerValidator.validateLedgerEntry('redeem', 500, 1000)).toThrowError(
        '[LedgerValidator] Financial Invariant Violation',
      )
    })

    it('should reject negative points for earn/bonus/refund entries', () => {
      expect(() => LedgerValidator.validateLedgerEntry('earn', -500, 1000)).toThrowError(
        '[LedgerValidator] Financial Invariant Violation',
      )
    })

    it('should reject redeem operations that drop balance below zero', () => {
      expect(() => LedgerValidator.validateLedgerEntry('redeem', -1500, 1000)).toThrowError(
        '[LedgerValidator] Insufficient Funds',
      )
    })
  })

  describe('PointsCalculator', () => {
    it('should calculate earned points applying tier earn multipliers', () => {
      // Explorer (1.0x): 5000 EGP * 1.0 = 5000 points
      expect(PointsCalculator.calculateEarnedPoints(5000, LoyaltyTier.EXPLORER)).toBe(5000)

      // Voyager (1.2x): 5000 EGP * 1.2 = 6000 points
      expect(PointsCalculator.calculateEarnedPoints(5000, LoyaltyTier.VOYAGER)).toBe(6000)

      // Elite (1.5x): 5000 EGP * 1.5 = 7500 points
      expect(PointsCalculator.calculateEarnedPoints(5000, LoyaltyTier.ELITE)).toBe(7500)
    })
  })
})
