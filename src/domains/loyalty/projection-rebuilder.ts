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

  async rebuildCustomerProjection(customerId: number): Promise<LoyaltyProjection> {
    const balance = await this.repository.getCurrentBalance(customerId)
    const { projection } = await this.repository.getCustomerAggregate(customerId)

    return {
      ...projection,
      balance,
      updatedAt: new Date().toISOString(),
    }
  }
}
