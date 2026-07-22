import type { DashboardQueryBus } from './query-bus'

/**
 * Dashboard Booking Hub
 * Read-only statement viewer for customer bookings, status filtering, and document links.
 */
export class DashboardBookingHub {
  private queryBus: DashboardQueryBus

  constructor(queryBus: DashboardQueryBus) {
    this.queryBus = queryBus
  }

  async getCustomerBookingsStatement(customerId: number) {
    return this.queryBus.bookingQueries.getByCustomerId(customerId)
  }
}
