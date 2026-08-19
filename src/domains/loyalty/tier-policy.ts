import { LoyaltyTier } from '@/types'
import { LoyaltyProgramConfig, TierDefinitionConfig, LoyaltyProgramConfigurationException } from './tier-config'
import type { LoyaltyPolicyResult, TierProgress } from './types'

/**
 * Pure Tier Policy
 * Business logic predicates governing loyalty tier qualification and upgrade eligibility.
 * Pure Domain Class: Accepts dynamic LoyaltyProgramConfig.
 */
export class TierPolicy {
  /**
   * Validates configuration and sorts tiers ascending by minSpentEGP.
   * STRICT FAIL-FAST: Throws if configuration is missing, thresholds are not ascending,
   * or lowest tier does not start at 0 EGP.
   */
  static getOrderedTiers(config: LoyaltyProgramConfig): TierDefinitionConfig[] {
    if (!config.tiers || config.tiers.length === 0) {
      throw new LoyaltyProgramConfigurationException(
        '[TierPolicy] Critical configuration error: No tiers defined in loyalty settings.',
      )
    }

    const sorted = [...config.tiers].sort((a, b) => a.minSpentEGP - b.minSpentEGP)

    // 1. Enforce lowest tier starts at exactly 0 EGP
    if (sorted[0].minSpentEGP !== 0) {
      throw new LoyaltyProgramConfigurationException(
        `[TierPolicy] Config error: The lowest tier [${sorted[0].tier}] must have minSpentEGP = 0 (found ${sorted[0].minSpentEGP}).`,
      )
    }

    // 2. Enforce strictly ascending unique thresholds
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].minSpentEGP <= sorted[i - 1].minSpentEGP) {
        throw new LoyaltyProgramConfigurationException(
          `[TierPolicy] Config error: Tier thresholds must be strictly ascending. [${sorted[i].tier}] (${sorted[i].minSpentEGP} EGP) is <= [${sorted[i - 1].tier}] (${sorted[i - 1].minSpentEGP} EGP).`,
        )
      }
    }

    return sorted
  }

  /**
   * Determine the highest eligible tier for a given cumulative spent total in EGP.
   * STRICT FAIL-FAST: Throws if spent amount is negative.
   */
  static evaluateEligibleTier(totalSpentEGP: number, config: LoyaltyProgramConfig): LoyaltyTier {
    if (totalSpentEGP < 0) {
      throw new Error(
        `[TierPolicy] Invalid evaluation request: spent amount cannot be negative (found ${totalSpentEGP}).`,
      )
    }

    const ordered = this.getOrderedTiers(config)

    // Find the highest tier where spend is >= threshold
    for (let i = ordered.length - 1; i >= 0; i--) {
      if (totalSpentEGP >= ordered[i].minSpentEGP) {
        return ordered[i].tier
      }
    }

    throw new LoyaltyProgramConfigurationException(
      '[TierPolicy] Config error: totalSpentEGP did not qualify for any configured tier.',
    )
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

    const ordered = this.getOrderedTiers(config)
    const currentIndex = ordered.findIndex((t) => t.tier.toLowerCase() === currentTier.toLowerCase())
    const eligibleIndex = ordered.findIndex((t) => t.tier.toLowerCase() === eligibleTier.toLowerCase())

    if (currentIndex === -1) {
      throw new LoyaltyProgramConfigurationException(
        `[TierPolicy] Current customer tier [${currentTier}] is missing from active configuration.`,
      )
    }
    if (eligibleIndex === -1) {
      throw new LoyaltyProgramConfigurationException(
        `[TierPolicy] Eligible target tier [${eligibleTier}] is missing from active configuration.`,
      )
    }

    if (eligibleIndex > currentIndex) {
      return { allowed: true }
    }

    return {
      allowed: false,
      code: 'TIER_NOT_ELIGIBLE',
      reason: `Total spent EGP ${totalSpentEGP} is not sufficient for tier upgrade above ${currentTier}.`,
    }
  }

  /**
   * Calculate progression toward the next tier purely in EGP spend.
   */
  static getTierProgress(
    totalSpentEGP: number,
    currentTier: LoyaltyTier,
    config: LoyaltyProgramConfig,
  ): TierProgress {
    const ordered = this.getOrderedTiers(config)
    const currentIndex = ordered.findIndex((t) => t.tier.toLowerCase() === currentTier.toLowerCase())

    if (currentIndex === -1) {
      throw new LoyaltyProgramConfigurationException(
        `[TierPolicy] Cannot compute progress: Customer tier [${currentTier}] is missing from active configuration.`,
      )
    }

    const nextTierDef = currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null

    if (!nextTierDef) {
      return {
        currentTier,
        nextTier: null,
        currentQualifyingSpendEGP: totalSpentEGP,
        nextTierMinSpentEGP: null,
        remainingQualifyingSpendEGP: null,
        percent: 100,
      }
    }

    const currentMin = ordered[currentIndex].minSpentEGP
    const nextMin = nextTierDef.minSpentEGP
    const range = nextMin - currentMin
    const progress = totalSpentEGP - currentMin
    const percent = range > 0 ? Math.min(100, Math.max(0, Math.round((progress / range) * 100))) : 0

    return {
      currentTier,
      nextTier: nextTierDef.tier,
      currentQualifyingSpendEGP: totalSpentEGP,
      nextTierMinSpentEGP: nextMin,
      remainingQualifyingSpendEGP: Math.max(0, nextMin - totalSpentEGP),
      percent,
    }
  }
}
