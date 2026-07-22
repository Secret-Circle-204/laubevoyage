import type { LoyaltyRepository } from './repository'
import { TierPolicy } from './tier-policy'
import { LoyaltyTier } from '@/types'

/**
 * Tier Rebuilder Service
 * Recalculates totalSpentEGP and updates customer tier from confirmed booking spend history.
 */
export class TierRebuilder {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async rebuildCustomerTier(customerId: number, confirmedBookingsSpentEGP: number): Promise<LoyaltyTier> {
    const eligibleTier = TierPolicy.evaluateEligibleTier(confirmedBookingsSpentEGP)
    await this.repository.updateCustomerTier(customerId, eligibleTier, 0)
    return eligibleTier
  }
}
