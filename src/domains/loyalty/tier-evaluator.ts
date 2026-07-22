import type { LoyaltyRepository } from './repository'
import { TierPolicy } from './tier-policy'
import { TIER_CONFIG } from './tier-config'
import { LoyaltyTier } from '@/types'
import type { PointLedgerRecord } from './types'

/**
 * Tier Evaluator Sub-Service
 * Evaluates tier advancement strictly based on cumulative totalSpentEGP.
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
  ): Promise<{ upgraded: boolean; newTier: LoyaltyTier; bonusRecord?: PointLedgerRecord }> {
    const { aggregate } = await this.repository.getCustomerAggregate(customerId)
    const currentTier = aggregate.tier
    const newTotalSpent = aggregate.totalSpentEGP + additionalSpentEGP

    const upgradePolicy = TierPolicy.canUpgradeTier(currentTier, newTotalSpent)

    if (!upgradePolicy.allowed) {
      if (additionalSpentEGP > 0) {
        await this.repository.updateCustomerTier(customerId, currentTier, additionalSpentEGP)
      }
      return { upgraded: false, newTier: currentTier }
    }

    const newTier = TierPolicy.evaluateEligibleTier(newTotalSpent)

    // Update customer tier in repository
    await this.repository.updateCustomerTier(customerId, newTier, additionalSpentEGP)

    // Grant tier upgrade bonus if configured and not claimed
    const bonusAmount = TIER_CONFIG[newTier].upgradeBonus
    let bonusRecord: PointLedgerRecord | undefined

    if (bonusAmount > 0) {
      bonusRecord = await this.repository.appendLedgerEntry(
        customerId,
        'tier_bonus',
        bonusAmount,
        `Tier upgrade bonus for achieving ${newTier} level`,
        'system_welcome',
        `tier_${newTier}_${customerId}`,
      )
    }

    return { upgraded: true, newTier, bonusRecord }
  }
}
