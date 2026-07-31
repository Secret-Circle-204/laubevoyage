import { describe, it, expect } from 'vitest'
import { LedgerValidator } from '@/domains/loyalty/ledger-validator'
import { PointsCalculator } from '@/domains/loyalty/points-calculator'
import { LoyaltyTier } from '@/types'
import type { LoyaltyProgramConfig } from '@/domains/loyalty/tier-config'

const mockConfig: LoyaltyProgramConfig = {
  id: 'test',
  programCode: 'TEST',
  name: 'Test Program',
  version: 1,
  status: 'published',
  baseEarnRate: 1,
  redemptionPointsUnit: 100,
  redemptionValueEGP: 10,
  minRedemptionPoints: 100,
  maxRedemptionPercent: 20,
  allowPartialRedemption: true,
  welcomeBonus: 0,
  expirationMonths: 12,
  bonusNeverExpires: true,
  tiers: {
    explorer: { tier: LoyaltyTier.EXPLORER, minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
    voyager: { tier: LoyaltyTier.VOYAGER, minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 0 },
    elite: { tier: LoyaltyTier.ELITE, minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 0 },
  }
}

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
      expect(PointsCalculator.calculateEarnedPoints(5000, LoyaltyTier.EXPLORER, mockConfig)).toBe(5000)

      // Voyager (1.2x): 5000 EGP * 1.2 = 6000 points
      expect(PointsCalculator.calculateEarnedPoints(5000, LoyaltyTier.VOYAGER, mockConfig)).toBe(6000)

      // Elite (1.5x): 5000 EGP * 1.5 = 7500 points
      expect(PointsCalculator.calculateEarnedPoints(5000, LoyaltyTier.ELITE, mockConfig)).toBe(7500)
    })
  })
})
