import { BookingStatus } from '@/types'
import type { Actor, BookingAggregate, PolicyResult } from './types'
import { validateTransition, isTransitionAllowed } from './state-machine'

/**
 * Booking Policy
 * Single source of truth for all business validation predicates in the Booking Domain.
 */
export class BookingPolicy {
  /**
   * Validate if a new booking can be created for the customer and experience.
   */
  static canCreate(
    userStatus: string | undefined,
    experienceAvailability: string | undefined,
  ): PolicyResult {
    if (userStatus === 'suspended' || userStatus === 'inactive') {
      return {
        allowed: false,
        code: 'USER_INACTIVE',
        reason: 'Customer account is suspended or inactive.',
      }
    }

    if (experienceAvailability && experienceAvailability !== 'available') {
      return {
        allowed: false,
        code: 'EXPERIENCE_UNAVAILABLE',
        reason: `Experience is currently ${experienceAvailability}.`,
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if points redemption request is valid.
   */
  static canRedeemPoints(availablePoints: number, requestedPoints: number): PolicyResult {
    if (requestedPoints <= 0) {
      return { allowed: true }
    }

    if (requestedPoints > availablePoints) {
      return {
        allowed: false,
        code: 'INSUFFICIENT_LOYALTY_POINTS',
        reason: `Requested redemption of ${requestedPoints} points exceeds available balance of ${availablePoints}.`,
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a booking can be confirmed after payment.
   */
  static canConfirm(booking: BookingAggregate): PolicyResult {
    if (booking.status !== BookingStatus.PAID) {
      return {
        allowed: false,
        code: 'INVALID_STATUS_FOR_CONFIRMATION',
        reason: `Cannot confirm booking in '${booking.status}' status. Expected '${BookingStatus.PAID}'.`,
      }
    }

    if (!isTransitionAllowed(booking.status, BookingStatus.CONFIRMED)) {
      return {
        allowed: false,
        code: 'FORBIDDEN_TRANSITION',
        reason: `State machine forbids transition from '${booking.status}' to '${BookingStatus.CONFIRMED}'.`,
      }
    }

    // Capacity Hold Expiry Check (Sole Source of Truth)
    if (booking.capacityHold) {
      if (booking.capacityHold.status === 'expired' || booking.capacityHold.status === 'released') {
        return {
          allowed: false,
          code: 'CAPACITY_HOLD_EXPIRED',
          reason: 'Cannot confirm booking: seat capacity hold has already expired or released.',
        }
      }
      
      if (booking.capacityHold.expiresAt) {
        const expiresAt = new Date(booking.capacityHold.expiresAt)
        if (new Date() >= expiresAt) {
          return {
            allowed: false,
            code: 'CAPACITY_HOLD_EXPIRED',
            reason: 'Cannot confirm booking: seat capacity hold duration has expired.',
          }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a booking can be cancelled.
   */
  static canCancel(booking: BookingAggregate, actor: Actor): PolicyResult {
    if (booking.status === BookingStatus.COMPLETED) {
      return {
        allowed: false,
        code: 'BOOKING_ALREADY_COMPLETED',
        reason: 'Completed bookings cannot be cancelled.',
      }
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
      return {
        allowed: false,
        code: 'BOOKING_ALREADY_CANCELLED',
        reason: `Booking is already in '${booking.status}' state.`,
      }
    }

    // Customer cancellation window check (e.g. at least 24 hours before trip start)
    if (actor.type === 'customer') {
      const startDate = new Date(booking.startDate)
      const now = new Date()
      const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntilStart < 24) {
        return {
          allowed: false,
          code: 'CANCELLATION_WINDOW_EXPIRED',
          reason: 'Customer cancellations are not permitted within 24 hours of trip start date.',
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a booking is eligible for refund.
   */
  static canRefund(booking: BookingAggregate): PolicyResult {
    if (booking.status !== BookingStatus.PAID && booking.status !== BookingStatus.CONFIRMED) {
      return {
        allowed: false,
        code: 'INELIGIBLE_FOR_REFUND',
        reason: `Only bookings in PAID or CONFIRMED state can be refunded. Current state: '${booking.status}'.`,
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a booking can be marked as completed after trip ends.
   */
  static canComplete(booking: BookingAggregate): PolicyResult {
    if (booking.status !== BookingStatus.CONFIRMED) {
      return {
        allowed: false,
        code: 'INVALID_STATUS_FOR_COMPLETION',
        reason: `Cannot complete booking in '${booking.status}' status. Expected '${BookingStatus.CONFIRMED}'.`,
      }
    }

    const endDate = new Date(booking.endDate)
    const now = new Date()

    if (now < endDate) {
      return {
        allowed: false,
        code: 'TRIP_NOT_ENDED',
        reason: 'Booking cannot be marked as completed before its end date.',
      }
    }

    return { allowed: true }
  }
}
