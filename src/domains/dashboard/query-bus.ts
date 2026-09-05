import { CustomerQueries } from '../customer/queries'
import { LoyaltyQueries } from '../loyalty/queries'
import { BookingQueries } from '../booking/queries'
import type { CustomerRepository } from '../customer/repositories/customer-repository'
import type { LoyaltyRepository } from '../loyalty/repository'
import type { BookingRepository } from '../booking/repository'

/**
 * Dashboard Query Bus
 * Query-only read-model bus decoupling Dashboard from state-mutation services via Constructor DI.
 */
export class DashboardQueryBus {
  public customerQueries: CustomerQueries
  public loyaltyQueries: LoyaltyQueries
  public bookingQueries: BookingQueries

  constructor(
    customerRepo: CustomerRepository,
    loyaltyRepo: LoyaltyRepository,
    bookingRepo: BookingRepository,
  ) {
    this.customerQueries = new CustomerQueries(customerRepo)
    this.loyaltyQueries = new LoyaltyQueries(loyaltyRepo)
    this.bookingQueries = new BookingQueries(bookingRepo)
  }
}
