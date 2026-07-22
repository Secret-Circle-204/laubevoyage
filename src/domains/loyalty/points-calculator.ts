import { LoyaltyTier } from '@/types'
import { TIER_CONFIG } from './tier-config'

export interface PointsCalculationOptions {
  categoryMultiplier?: number
  campaignBonusMultiplier?: number
}

/**
 * Dedicated Points Calculator
 * Single source of truth for point calculations based on EGP base spend.
 * Fully extensible for seasonal campaigns, category multipliers, and partner rewards.
 */
export class PointsCalculator {
  /**
   * Calculate earned points for a booking spend in EGP base currency.
   */
  static calculateEarnedPoints(
    amountSpentEGP: number,
    tier: LoyaltyTier,
    options?: PointsCalculationOptions,
  ): number {
    if (amountSpentEGP <= 0) return 0

    const baseEarnRate = TIER_CONFIG[tier].earnMultiplier
    const categoryMult = options?.categoryMultiplier || 1.0
    const campaignMult = options?.campaignBonusMultiplier || 1.0

    const totalMultiplier = baseEarnRate * categoryMult * campaignMult
    return Math.floor(amountSpentEGP * totalMultiplier)
  }

  /**
   * Calculate EGP monetary value of loyalty points (1 point = 1 EGP base discount).
   */
  static calculatePointsMonetaryValueEGP(points: number): number {
    return Math.max(0, points)
  }
}
