import { describe, it, expect } from 'vitest'
import { LoyaltyPolicy } from '@/domains/loyalty/policy'
import { TierPolicy } from '@/domains/loyalty/tier-policy'
import { LoyaltyTier } from '@/types'

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
      expect(TierPolicy.evaluateEligibleTier(0)).toBe(LoyaltyTier.EXPLORER)
      expect(TierPolicy.evaluateEligibleTier(4999)).toBe(LoyaltyTier.EXPLORER)
      expect(TierPolicy.evaluateEligibleTier(5000)).toBe(LoyaltyTier.VOYAGER)
      expect(TierPolicy.evaluateEligibleTier(15000)).toBe(LoyaltyTier.ELITE)
    })
  })
})
