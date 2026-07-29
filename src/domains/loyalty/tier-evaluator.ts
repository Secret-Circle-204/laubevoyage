import type { LoyaltyRepository } from './repository'
import { TierPolicy } from './tier-policy'
import { LoyaltyTier } from '@/types'
import type { PointLedgerRecord } from './types'
import type { LoyaltyProgramConfig, LeanRulesSnapshot } from './tier-config'

/**
 * Tier Evaluator Sub-Service
 * Evaluates tier advancement strictly based on cumulative totalSpentEGP and dynamic LoyaltyProgramConfig.
 * Grants single-claim tier upgrade bonus upon promotion.
 */
export class TierEvaluator {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async evaluateAndUpgrade(
    customerId: number,
    additionalSpentEGP: number = 0,
    config?: LoyaltyProgramConfig,
  ): Promise<{ upgraded: boolean; newTier: LoyaltyTier; bonusRecord?: PointLedgerRecord }> {
    const { aggregate } = await this.repository.getCustomerAggregate(customerId)
    const currentTier = aggregate.tier
    const newTotalSpent = aggregate.totalSpentEGP + additionalSpentEGP

    if (!config) {
      // If config not passed directly, default return current tier state
      return { upgraded: false, newTier: currentTier }
    }

    const upgradePolicy = TierPolicy.canUpgradeTier(currentTier, newTotalSpent, config)

    if (!upgradePolicy.allowed) {
      if (additionalSpentEGP > 0) {
        await this.repository.updateCustomerTier(customerId, currentTier, additionalSpentEGP)
      }
      return { upgraded: false, newTier: currentTier }
    }

    const newTier = TierPolicy.evaluateEligibleTier(newTotalSpent, config)

    // Update customer tier in repository
    await this.repository.updateCustomerTier(customerId, newTier, additionalSpentEGP)

    // Grant tier upgrade bonus if configured and not claimed
    const bonusAmount = config.tiers[newTier]?.upgradeBonus || 0
    let bonusRecord: PointLedgerRecord | undefined

    if (bonusAmount > 0) {
      const leanSnapshot: LeanRulesSnapshot = {
        baseEarnRate: config.baseEarnRate,
        tierMultiplier: config.tiers[newTier]?.earnMultiplier || 1.0,
        redemptionPointsUnit: config.redemptionPointsUnit,
        redemptionValueEGP: config.redemptionValueEGP,
        welcomeBonus: config.welcomeBonus,
        upgradeBonus: bonusAmount,
      }

      bonusRecord = await this.repository.appendLedgerEntry(
        customerId,
        'tier_bonus',
        bonusAmount,
        `Tier upgrade bonus for achieving ${newTier} level`,
        'system_welcome',
        `tier_${newTier}_${customerId}`,
        undefined,
        undefined,
        {
          programId: config.id,
          programCode: config.programCode,
          programVersion: config.version,
          rulesSnapshot: leanSnapshot,
        },
      )
    }

    return { upgraded: true, newTier, bonusRecord }
  }
}
