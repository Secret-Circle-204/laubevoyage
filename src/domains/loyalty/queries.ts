import type { LoyaltyRepository } from './repository'
import type { LoyaltyAggregate } from './aggregate'
import type { LoyaltyProjection } from './projection'
import type { PointLedgerRecord } from './types'
import type { RequestContext } from '@/types'

/**
 * Loyalty Queries Sub-Service
 * Read-only queries for fetching balance, projections, and transaction histories.
 */
export class LoyaltyQueries {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async getBalance(customerId: number, context?: RequestContext): Promise<number> {
    return this.repository.getCurrentBalance(customerId, context)
  }

  async getAggregateAndProjection(customerId: number, context?: RequestContext): Promise<{ aggregate: LoyaltyAggregate; projection: LoyaltyProjection }> {
    return this.repository.getCustomerAggregate(customerId, context)
  }

  async getProjection(customerId: number, context?: RequestContext): Promise<LoyaltyProjection> {
    const res = await this.repository.getCustomerAggregate(customerId, context)
    return res.projection
  }

  async getHistory(customerId: number, limit = 20, context?: RequestContext): Promise<PointLedgerRecord[]> {
    return this.repository.getLedgerHistory(customerId, limit, context)
  }

  async getActiveProgramConfig(context?: RequestContext) {
    return this.repository.getActiveProgramConfig(undefined, context)
  }
}
