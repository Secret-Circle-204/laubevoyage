import type { PaginatedResponse, RequestContext, BookingStatus } from '@/types'
import type { BookingAggregate, CustomerTripSummary } from './types'
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
    filters?: { status?: BookingStatus },
  ): Promise<PaginatedResponse<BookingAggregate>> {
    return this.repository.findByUser(userId, page, limit, filters)
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
}
