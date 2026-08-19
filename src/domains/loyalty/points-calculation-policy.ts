import { LoyaltyProgramConfig, LoyaltyProgramConfigurationException } from './tier-config'
import { LoyaltyTier } from '@/types'

/**
 * Single Source of Truth for Loyalty Point calculations.
 * Enforces Fail-Fast validations.
 */
export class PointCalculationPolicy {
  /**
   * Computes point-earning potential based on base spent EGP, active multiplier, and welcome rate.
   * Throws if the tier is unknown in the active configuration.
   */
  static calculateEarnedPoints(
    amountEGP: number,
    tier: LoyaltyTier,
    config: LoyaltyProgramConfig,
  ): number {
    const normalizedTier = tier.toLowerCase()
    const tierConfig = config.tiers.find((t) => t.tier.toLowerCase() === normalizedTier)
    
    if (!tierConfig) {
      throw new LoyaltyProgramConfigurationException(
        `[PointCalculationPolicy] Failed to calculate points: Customer has unknown loyalty tier [${tier}] which is missing from the active config.`,
      )
    }

    return Math.floor(amountEGP * config.baseEarnRate * tierConfig.earnMultiplier)
  }

  /**
   * Computes EGP discount value for a given points balance.
   */
  static calculatePointsValueEGP(points: number, config: LoyaltyProgramConfig): number {
    return Math.floor((points / config.redemptionPointsUnit) * config.redemptionValueEGP)
  }
}
