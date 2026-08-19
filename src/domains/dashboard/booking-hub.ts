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

  async getCustomerBookingsStatement(customerId: number, page = 1, limit = 20) {
    return this.queryBus.bookingQueries.getUserBookings(customerId, page, limit)
  }
}

