import type { DashboardQueryBus } from './query-bus'

/**
 * Dashboard Profile Hub
 * Read-only viewer for customer identity, companion travelers, and addresses.
 */
export class DashboardProfileHub {
  private queryBus: DashboardQueryBus

  constructor(queryBus: DashboardQueryBus) {
    this.queryBus = queryBus
  }

  async getCustomerProfile(customerId: number) {
    return this.queryBus.customerQueries.getById(customerId)
  }
}
