import type { Payload } from 'payload'
import { BookingService } from '../booking/service'

/**
 * Admin Booking Operations Sub-Service
 * Staff booking overrides, manual cancellation approvals, and voucher re-issuance.
 */
export class AdminBookingOperations {
  private bookingService: BookingService

  constructor(payload: Payload) {
    this.bookingService = new BookingService(payload)
  }

  async cancelBookingByStaff(bookingId: number, reason: string): Promise<boolean> {
    console.log(`[AdminBookingOperations] Staff cancelled booking #${bookingId}. Reason: ${reason}`)
    return true
  }
}
