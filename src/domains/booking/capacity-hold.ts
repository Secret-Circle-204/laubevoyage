import type { CapacityHoldEntity } from './types'

/**
 * Capacity Hold Manager
 * Responsible for creating, committing, releasing, and expiring seat capacity locks.
 */
export class CapacityHoldService {
  public static readonly DEFAULT_HOLD_DURATION_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Create an active capacity hold for a booking.
   */
  static createHold(params: {
    bookingId: number
    customerId: number
    experienceId: number
    departureId?: string
    departureSlotId?: number
    seats: number
    date: string
    holdDurationMs?: number
  }): CapacityHoldEntity {
    const duration = params.holdDurationMs || this.DEFAULT_HOLD_DURATION_MS
    const now = new Date()
    const expiresAt = new Date(now.getTime() + duration)

    return {
      holdId: `cap_hold_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookingId: params.bookingId,
      customerId: params.customerId,
      experienceId: params.experienceId,
      departureId: params.departureId,
      departureSlotId: params.departureSlotId,
      seats: params.seats,
      date: params.date,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'active',
    }
  }

  /**
   * Instance method to reserve capacity.
   */
  reserveCapacity(
    bookingId: number,
    customerId: number,
    experienceId: number,
    seats: number,
    date: string,
  ): CapacityHoldEntity {
    return CapacityHoldService.createHold({ bookingId, customerId, experienceId, seats, date })
  }

  /**
   * Transition capacity hold to committed (upon payment success).
   */
  static commitHold(hold: CapacityHoldEntity): CapacityHoldEntity {
    return {
      ...hold,
      status: 'committed',
    }
  }

  /**
   * Transition capacity hold to released (upon cancellation).
   */
  static releaseHold(hold: CapacityHoldEntity): CapacityHoldEntity {
    return {
      ...hold,
      status: 'released',
    }
  }

  /**
   * Transition capacity hold to expired (upon payment window timeout).
   */
  static expireHold(hold: CapacityHoldEntity): CapacityHoldEntity {
    return {
      ...hold,
      status: 'expired',
    }
  }
}
