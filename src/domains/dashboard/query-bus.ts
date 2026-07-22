import type { Payload } from 'payload'
import { CustomerQueries } from '../customer/queries'
import { LoyaltyQueries } from '../loyalty/queries'
import { BookingQueries } from '../booking/queries'
import { CustomerRepository } from '../customer/repositories/customer-repository'
import { LoyaltyRepository } from '../loyalty/repository'
import { BookingRepository } from '../booking/repository'

/**
 * Dashboard Query Bus
 * Query-only read-model bus decoupling Dashboard from state-mutation services.
 */
export class DashboardQueryBus {
  public customerQueries: CustomerQueries
  public loyaltyQueries: LoyaltyQueries
  public bookingQueries: BookingQueries

  constructor(payload: Payload) {
    const customerRepo = new CustomerRepository(payload)
    const loyaltyRepo = new LoyaltyRepository(payload)
    const bookingRepo = new BookingRepository(payload)

    this.customerQueries = new CustomerQueries(customerRepo)
    this.loyaltyQueries = new LoyaltyQueries(loyaltyRepo)
    this.bookingQueries = new BookingQueries(bookingRepo)
  }
}
