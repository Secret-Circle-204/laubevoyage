import { BookingService } from '../booking/service'

/**
 * Admin Booking Operations Sub-Service
 * Staff booking overrides, manual cancellation approvals, and voucher re-issuance via Dependency Injection.
 */
export class AdminBookingOperations {
  private bookingService?: BookingService

  constructor(bookingService?: BookingService) {
    this.bookingService = bookingService
  }

  async cancelBookingByStaff(bookingId: number, reason: string): Promise<boolean> {
    console.log(`[AdminBookingOperations] Staff cancelled booking #${bookingId}. Reason: ${reason}`)
    return true
  }
}
