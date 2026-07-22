import type { LoyaltyRepository } from './repository'
import type { LoyaltyAggregate } from './aggregate'
import type { LoyaltyProjection } from './projection'

/**
 * Loyalty Queries Sub-Service
 * Read-only queries for fetching balance, projections, and transaction histories.
 */
export class LoyaltyQueries {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async getBalance(customerId: number): Promise<number> {
    return this.repository.getCurrentBalance(customerId)
  }

  async getAggregateAndProjection(customerId: number): Promise<{ aggregate: LoyaltyAggregate; projection: LoyaltyProjection }> {
    return this.repository.getCustomerAggregate(customerId)
  }

  async getProjection(customerId: number): Promise<LoyaltyProjection> {
    const res = await this.repository.getCustomerAggregate(customerId)
    return res.projection
  }
}
