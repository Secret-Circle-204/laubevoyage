import type { Payload } from 'payload'
import { BookingService } from '../booking/service'
import { BookingRepository } from '../booking/repository'

/**
 * Admin Booking Operations Sub-Service
 * Staff booking overrides, manual cancellation approvals, and voucher re-issuance.
 */
export class AdminBookingOperations {
  private bookingService: BookingService

  constructor(payload: Payload) {
    const bookingRepo = new BookingRepository(payload)
    this.bookingService = new BookingService(bookingRepo)
  }

  async cancelBookingByStaff(bookingId: number, reason: string): Promise<boolean> {
    console.log(`[AdminBookingOperations] Staff cancelled booking #${bookingId}. Reason: ${reason}`)
    return true
  }
}
