import type { RequestContext } from '@/types'
import type { LoyaltyRepository } from './repository'
import type { LoyaltyProjection } from './projection'

/**
 * Projection Rebuilder
 * Self-healing projection service that recalculates running balance from PointLedger history.
 */
export class ProjectionRebuilder {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async rebuildCustomerProjection(customerId: number, context?: RequestContext): Promise<LoyaltyProjection> {
    const balance = await this.repository.getCurrentBalance(customerId, context)
    const { projection } = await this.repository.getCustomerAggregate(customerId, context)

    // Persist the recalculated balance in the customer document cache (Self-Healing Repair)
    await this.repository.updateCustomerProjection(customerId, balance, 'rebuild', context)

    return {
      ...projection,
      balance,
      updatedAt: new Date().toISOString(),
    }
  }
}
