import type { DashboardQueryBus } from './query-bus'

/**
 * Dashboard Loyalty Hub
 * Read-only statement viewer for point ledgers and tier progress.
 */
export class DashboardLoyaltyHub {
  private queryBus: DashboardQueryBus

  constructor(queryBus: DashboardQueryBus) {
    this.queryBus = queryBus
  }

  async getLoyaltyStatement(customerId: number) {
    return this.queryBus.loyaltyQueries.getProjection(customerId)
  }
}
