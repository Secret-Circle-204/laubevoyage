import { LoyaltyTier } from '@/types'
import { TIER_CONFIG } from './tier-config'
import type { LoyaltyPolicyResult } from './types'

/**
 * Tier Policy
 * Business logic predicates governing loyalty tier qualification and upgrade bonuses.
 */
export class TierPolicy {
  /**
   * Determine the highest eligible tier for a given cumulative spent total in EGP.
   */
  static evaluateEligibleTier(totalSpentEGP: number): LoyaltyTier {
    if (totalSpentEGP >= TIER_CONFIG[LoyaltyTier.ELITE].minSpentEGP) {
      return LoyaltyTier.ELITE
    }
    if (totalSpentEGP >= TIER_CONFIG[LoyaltyTier.VOYAGER].minSpentEGP) {
      return LoyaltyTier.VOYAGER
    }
    return LoyaltyTier.EXPLORER
  }

  /**
   * Validate if a customer is eligible for tier upgrade (Upgrades only, no downgrades).
   */
  static canUpgradeTier(currentTier: LoyaltyTier, totalSpentEGP: number): LoyaltyPolicyResult {
    const eligibleTier = this.evaluateEligibleTier(totalSpentEGP)

    const tierRanks: Record<LoyaltyTier, number> = {
      [LoyaltyTier.EXPLORER]: 1,
      [LoyaltyTier.VOYAGER]: 2,
      [LoyaltyTier.ELITE]: 3,
    }

    if (tierRanks[eligibleTier] > tierRanks[currentTier]) {
      return { allowed: true }
    }

    return {
      allowed: false,
      code: 'TIER_NOT_ELIGIBLE',
      reason: `Total spent EGP ${totalSpentEGP} is not sufficient for tier upgrade above ${currentTier}.`,
    }
  }
}
