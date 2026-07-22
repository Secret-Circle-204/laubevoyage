import type { LoyaltyPolicyResult } from './types'

/**
 * Pure Loyalty Policy
 * Single source of truth for pure business validation rules in the Loyalty Domain.
 */
export class LoyaltyPolicy {
  /**
   * Validate if points can be earned.
   */
  static canEarn(points: number): LoyaltyPolicyResult {
    if (points <= 0) {
      return {
        allowed: false,
        code: 'INVALID_EARN_AMOUNT',
        reason: 'Earn points must be greater than zero.',
      }
    }
    return { allowed: true }
  }

  /**
   * Validate if points can be redeemed.
   */
  static canRedeem(currentBalance: number, requestedPoints: number): LoyaltyPolicyResult {
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

    return { allowed: true }
  }

  /**
   * Validate if welcome bonus can be claimed (Ledger-based protection).
   */
  static canClaimWelcomeBonus(hasExistingWelcomeBonusLedger: boolean): LoyaltyPolicyResult {
    if (hasExistingWelcomeBonusLedger) {
      return {
        allowed: false,
        code: 'WELCOME_BONUS_ALREADY_CLAIMED',
        reason: 'Welcome bonus has already been granted to this customer account.',
      }
    }
    return { allowed: true }
  }
}
