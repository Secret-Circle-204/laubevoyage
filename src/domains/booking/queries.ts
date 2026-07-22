import type { PaginatedResponse } from '@/types'
import type { BookingAggregate } from './types'
import { BookingRepository } from './repository'

/**
 * Booking Queries Sub-Service
 * Read-only query handler for fetching single bookings and customer booking lists.
 */
export class BookingQueries {
  private repository: BookingRepository

  constructor(repository: BookingRepository) {
    this.repository = repository
  }

  async getById(bookingId: number): Promise<BookingAggregate> {
    return this.repository.findById(bookingId)
  }

  async getByBookingNumber(bookingNumber: string): Promise<BookingAggregate | null> {
    return this.repository.findByBookingNumber(bookingNumber)
  }

  async getUserBookings(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<BookingAggregate>> {
    return this.repository.findByUser(userId, page, limit)
  }

  async getByCustomerId(customerId: number): Promise<BookingAggregate[]> {
    const res = await this.repository.findByUser(customerId, 1, 100)
    return res.data
  }
}
