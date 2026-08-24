import { BookingStatus } from '@/types'
import type { BookingAggregate } from '../booking/types'
import type { PolicyResult } from '../booking/types'

export class ReviewPolicy {
  static canReview(
    booking: BookingAggregate,
    customerId: number,
    experienceId: number,
  ): PolicyResult {
    if (booking.customerId !== customerId) {
      return {
        allowed: false,
        code: 'BOOKING_NOT_OWNED',
        reason: `Customer #${customerId} does not own Booking #${booking.id}.`,
      }
    }

    if (booking.experienceId !== experienceId) {
      return {
        allowed: false,
        code: 'EXPERIENCE_MISMATCH',
        reason: `Booking #${booking.id} experience ID (${booking.experienceId}) does not match requested experience ID (${experienceId}).`,
      }
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      return {
        allowed: false,
        code: 'BOOKING_NOT_COMPLETED',
        reason: `Only bookings in COMPLETED state can be reviewed. Current state: '${booking.status}'.`,
      }
    }

    return { allowed: true }
  }
}
