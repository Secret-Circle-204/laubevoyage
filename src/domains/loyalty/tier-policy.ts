import { LoyaltyTier } from '@/types'
import type { LoyaltyProgramConfig } from './tier-config'
import type { LoyaltyPolicyResult } from './types'

/**
 * Pure Tier Policy
 * Business logic predicates governing loyalty tier qualification and upgrade eligibility.
 * Pure Domain Class: Accepts dynamic LoyaltyProgramConfig.
 */
export class TierPolicy {
  /**
   * Determine the highest eligible tier for a given cumulative spent total in EGP.
   */
  static evaluateEligibleTier(totalSpentEGP: number, config: LoyaltyProgramConfig): LoyaltyTier {
    const eliteConfig = config.tiers[LoyaltyTier.ELITE]
    const voyagerConfig = config.tiers[LoyaltyTier.VOYAGER]

    if (!eliteConfig) {
      throw new Error('[TierPolicy] Critical configuration error: Elite tier definition is missing from loyalty program.')
    }
    if (!voyagerConfig) {
      throw new Error('[TierPolicy] Critical configuration error: Voyager tier definition is missing from loyalty program.')
    }

    const eliteThreshold = eliteConfig.minSpentEGP
    const voyagerThreshold = voyagerConfig.minSpentEGP

    if (totalSpentEGP >= eliteThreshold) {
      return LoyaltyTier.ELITE
    }
    if (totalSpentEGP >= voyagerThreshold) {
      return LoyaltyTier.VOYAGER
    }
    return LoyaltyTier.EXPLORER
  }

  /**
   * Validate if a customer is eligible for tier upgrade (Upgrades only, no downgrades).
   */
  static canUpgradeTier(
    currentTier: LoyaltyTier,
    totalSpentEGP: number,
    config: LoyaltyProgramConfig,
  ): LoyaltyPolicyResult {
    const eligibleTier = this.evaluateEligibleTier(totalSpentEGP, config)

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
