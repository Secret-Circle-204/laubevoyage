import type { PaginatedResponse, RequestContext } from '@/types'
import type {
  BookingAggregate,
  CustomerTripSummary,
  BookingUserFilter,
  CustomerCompanionTravelerProjection,
} from './types'
import { BookingRepository } from './repository'

/**
 * Booking Queries Sub-Service
 * Read-only query handler for fetching single bookings, customer trip summaries, and paginated lists.
 */
export class BookingQueries {
  private repository: BookingRepository

  constructor(repository: BookingRepository) {
    this.repository = repository
  }

  async getById(bookingId: number, context?: RequestContext): Promise<BookingAggregate> {
    return this.repository.findById(bookingId, context)
  }

  async getByBookingNumber(
    bookingNumber: string,
    customerId?: number,
    context?: RequestContext,
  ): Promise<BookingAggregate | null> {
    return this.repository.findByBookingNumber(bookingNumber, customerId, context)
  }

  async getUserBookings(
    userId: number,
    page: number = 1,
    limit: number = 10,
    filters?: BookingUserFilter,
  ): Promise<PaginatedResponse<BookingAggregate>> {
    return this.repository.findByUser(userId, page, limit, filters)
  }

  async getCustomerCompanionTravelers(
    customerId: number,
    options?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<CustomerCompanionTravelerProjection>> {
    return this.repository.findCompanionTravelersByCustomerId(customerId, options)
  }

  async getManyByIds(bookingIds: number[]): Promise<BookingAggregate[]> {
    return this.repository.findManyByIds(bookingIds)
  }

  async getCustomerTripSummary(
    customerId: number,
    context?: RequestContext,
  ): Promise<CustomerTripSummary> {
    return this.repository.getCustomerTripSummary(customerId, context)
  }

  async getActiveHeldPointsSummaryForCustomer(
    customerId: number,
    context?: RequestContext,
  ): Promise<{ totalPoints: number; count: number }> {
    return this.repository.getActiveHeldPointsSummaryForCustomer(customerId, context)
  }

  async getActiveHeldPointsForCustomer(
    customerId: number,
    context?: RequestContext,
  ): Promise<number> {
    return this.repository.getActiveHeldPointsForCustomer(customerId, context)
  }
}
