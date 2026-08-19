import { describe, it, expect } from 'vitest'
import { LoyaltyPolicy } from '@/domains/loyalty/policy'
import { TierPolicy } from '@/domains/loyalty/tier-policy'
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
  tiers: [
    { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1.0, upgradeBonus: 0 },
    { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.2, upgradeBonus: 0 },
    { tier: 'elite', label: 'Elite', minSpentEGP: 15000, earnMultiplier: 1.5, upgradeBonus: 0 },
  ]
}

describe('Loyalty Domain: Policy Unit Tests', () => {
  describe('canEarn', () => {
    it('should disallow earn for non-positive point amounts', () => {
      const result = LoyaltyPolicy.canEarn(0)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INVALID_EARN_AMOUNT')
    })

    it('should allow earn for positive point amounts', () => {
      const result = LoyaltyPolicy.canEarn(500)
      expect(result.allowed).toBe(true)
    })
  })

  describe('canRedeem', () => {
    it('should disallow redeem if requested points exceed available balance', () => {
      const result = LoyaltyPolicy.canRedeem(100, 500)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INSUFFICIENT_POINTS')
    })

    it('should allow redeem if requested points are within available balance', () => {
      const result = LoyaltyPolicy.canRedeem(1000, 500)
      expect(result.allowed).toBe(true)
    })
  })

  describe('TierPolicy', () => {
    it('should evaluate correct tier based on cumulative spent EGP', () => {
      expect(TierPolicy.evaluateEligibleTier(0, mockConfig)).toBe('explorer')
      expect(TierPolicy.evaluateEligibleTier(4999, mockConfig)).toBe('explorer')
      expect(TierPolicy.evaluateEligibleTier(5000, mockConfig)).toBe('voyager')
      expect(TierPolicy.evaluateEligibleTier(15000, mockConfig)).toBe('elite')
    })
  })
})
