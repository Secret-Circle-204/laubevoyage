import type { LoyaltyRepository } from './repository'
import type { PointLedgerRecord } from './types'
import { LoyaltyPolicy } from './policy'
import { PointsCalculator } from './points-calculator'
import type { LoyaltyProgramConfig, LeanRulesSnapshot } from './tier-config'

/**
 * Points Earn Processor Sub-Service
 * Handles point earning calculations and ledger appending using dynamic LoyaltyProgramConfig.
 */
export class PointsEarnProcessor {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async earnForBooking(
    customerId: number,
    amountSpentEGP: number,
    bookingId: number,
    bookingNumber: string,
    config: LoyaltyProgramConfig,
  ): Promise<PointLedgerRecord> {
    const { aggregate } = await this.repository.getCustomerAggregate(customerId)

    const pointsToEarn = PointsCalculator.calculateEarnedPoints(amountSpentEGP, aggregate.tier, config)

    const policyResult = LoyaltyPolicy.canEarn(pointsToEarn)
    if (!policyResult.allowed) {
      throw new Error(`[LoyaltyPolicy] Cannot earn points: ${policyResult.reason}`)
    }

    const calculateExpiry = (): string => {
      const d = new Date()
      const months = config.expirationMonths || 12
      d.setMonth(d.getMonth() + months)
      return d.toISOString()
    }

    const tierConfig = config.tiers[aggregate.tier] || config.tiers.explorer

    const leanSnapshot: LeanRulesSnapshot = {
      baseEarnRate: config.baseEarnRate,
      tierMultiplier: tierConfig.earnMultiplier,
      redemptionPointsUnit: config.redemptionPointsUnit,
      redemptionValueEGP: config.redemptionValueEGP,
      welcomeBonus: config.welcomeBonus,
    }

    return this.repository.appendLedgerEntry(
      customerId,
      'earn',
      pointsToEarn,
      `Earned ${pointsToEarn} points for booking #${bookingNumber}`,
      'booking',
      String(bookingId),
      bookingId,
      calculateExpiry(),
      {
        amountSpentEGP,
        tier: aggregate.tier,
        programId: config.id,
        programCode: config.programCode,
        programVersion: config.version,
        rulesSnapshot: leanSnapshot,
      },
    )
  }

  async grantWelcomeBonus(
    customerId: number,
    config: LoyaltyProgramConfig,
  ): Promise<PointLedgerRecord> {
    const existingBonus = await this.repository.findLedgerByReference(
      'system_welcome',
      String(customerId),
      'welcome_bonus',
    )
    const policyResult = LoyaltyPolicy.canClaimWelcomeBonus(!!existingBonus)

    if (!policyResult.allowed) {
      throw new Error(`[LoyaltyPolicy] Cannot grant welcome bonus: ${policyResult.reason}`)
    }

    const welcomePoints = config.welcomeBonus ?? 100

    const leanSnapshot: LeanRulesSnapshot = {
      baseEarnRate: config.baseEarnRate,
      tierMultiplier: 1.0,
      redemptionPointsUnit: config.redemptionPointsUnit,
      redemptionValueEGP: config.redemptionValueEGP,
      welcomeBonus: welcomePoints,
      bonusNeverExpires: config.bonusNeverExpires,
    }

    const calculateExpiry = (): string | undefined => {
      if (config.bonusNeverExpires) return undefined
      const d = new Date()
      d.setMonth(d.getMonth() + (config.expirationMonths || 12))
      return d.toISOString()
    }

    return this.repository.appendLedgerEntry(
      customerId,
      'welcome_bonus',
      welcomePoints,
      'Welcome bonus for registering email account',
      'system_welcome',
      String(customerId),
      undefined,
      calculateExpiry(),
      {
        programId: config.id,
        programCode: config.programCode,
        programVersion: config.version,
        rulesSnapshot: leanSnapshot,
      },
    )
  }
}
