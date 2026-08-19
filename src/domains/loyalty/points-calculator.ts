import { LoyaltyTier } from '@/types'
import type { LoyaltyProgramConfig } from './tier-config'
import type { LoyaltyPolicyResult } from './types'

/**
 * Dedicated Pure Points Calculator
 * Single source of truth for point calculations based on EGP base spend and dynamic LoyaltyProgramConfig.
 * Pure Domain Class: Does not couple to database or external APIs.
 */
export class PointsCalculator {
  /**
   * Calculate earned loyalty points for booking spend in EGP base currency.
   */
  static calculateEarnedPoints(
    amountSpentEGP: number,
    tier: LoyaltyTier,
    config: LoyaltyProgramConfig,
  ): number {
    const tierConfig = config.tiers.find((t) => t.tier.toLowerCase() === tier.toLowerCase())
    if (!tierConfig) {
      throw new Error(`[PointsCalculator] Customer tier [${tier}] not found in active config.`)
    }
    const baseEarnRate = config.baseEarnRate
    const tierMultiplier = tierConfig.earnMultiplier

    const totalMultiplier = baseEarnRate * tierMultiplier
    return Math.floor(amountSpentEGP * totalMultiplier)
  }

  /**
   * Calculate EGP base monetary discount value of points (e.g. 100 points = 10 EGP).
   */
  static calculatePointsMonetaryValueEGP(points: number, config: LoyaltyProgramConfig): number {
    if (points <= 0) return 0
    const pointsUnit = config.redemptionPointsUnit
    const valueEGP = config.redemptionValueEGP
    return Math.floor((points / pointsUnit) * valueEGP)
  }

  /**
   * Validate if requested point redemption amount conforms to Wallet economics and business policy.
   */
  static validateRedemptionAmount(
    requestedPoints: number,
    currentBalance: number,
    bookingTotalEGP: number,
    config: LoyaltyProgramConfig,
  ): LoyaltyPolicyResult {
    if (requestedPoints <= 0) {
      return {
        allowed: false,
        code: 'INVALID_REDEEM_AMOUNT',
        reason: 'Redeem points must be greater than zero.',
      }
    }

    if (requestedPoints > currentBalance) {
      return {
        allowed: false,
        code: 'INSUFFICIENT_POINTS',
        reason: `Insufficient points balance. Available: ${currentBalance}, Requested: ${requestedPoints}.`,
      }
    }

    if (requestedPoints < config.minRedemptionPoints) {
      return {
        allowed: false,
        code: 'MIN_REDEMPTION_NOT_MET',
        reason: `Requested points ${requestedPoints} is below minimum threshold of ${config.minRedemptionPoints} points.`,
      }
    }

    if (config.redemptionStepUnit && config.redemptionStepUnit > 0) {
      if (requestedPoints % config.redemptionStepUnit !== 0) {
        return {
          allowed: false,
          code: 'INVALID_STEP_UNIT',
          reason: `Requested points must be a multiple of ${config.redemptionStepUnit} points.`,
        }
      }
    }

    const calculatedDiscountEGP = this.calculatePointsMonetaryValueEGP(requestedPoints, config)

    const maxAllowedByPercentEGP = (bookingTotalEGP * config.maxRedemptionPercent) / 100
    if (calculatedDiscountEGP > maxAllowedByPercentEGP) {
      return {
        allowed: false,
        code: 'EXCEEDS_MAX_PERCENT_LIMIT',
        reason: `Discount ${calculatedDiscountEGP} EGP exceeds ${config.maxRedemptionPercent}% maximum allowed booking discount (${maxAllowedByPercentEGP} EGP).`,
      }
    }

    if (config.maxRedemptionFixedEGP && config.maxRedemptionFixedEGP > 0) {
      if (calculatedDiscountEGP > config.maxRedemptionFixedEGP) {
        return {
          allowed: false,
          code: 'EXCEEDS_MAX_FIXED_LIMIT',
          reason: `Discount ${calculatedDiscountEGP} EGP exceeds maximum fixed redemption limit of ${config.maxRedemptionFixedEGP} EGP.`,
        }
      }
    }

    return { allowed: true }
  }
}
