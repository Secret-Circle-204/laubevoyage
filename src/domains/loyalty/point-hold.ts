import type { LoyaltyProgramConfig } from './tier-config'
import type { PointHoldStatus } from './types'
import type { PointHoldEntity } from '../booking/types'

export interface PointReservationEntity {
  reservationId: string
  bookingId: number
  customerId: number
  pointsReserved: number
  valueEGP: number
  status: PointHoldStatus
  configSnapshot?: LoyaltyProgramConfig
  expiresAt: string
  createdAt: string
}

export interface CreateReservationParams {
  bookingId: number
  customerId: number
  pointsReserved: number
  valueEGP: number
  configSnapshot?: LoyaltyProgramConfig
  holdMinutes?: number
}

/**
 * Point Reservation Engine (Double-Spend Protection)
 * Manages active checkout point reservations without writing to immutable PointLedger.
 * Prevents customers from opening multiple browser tabs to double-spend the same points.
 */
export class PointHoldService {
  private activeReservations: Map<string, PointReservationEntity> = new Map()

  /**
   * Reserve points for an active checkout session.
   */
  reservePoints(params: CreateReservationParams): PointReservationEntity {
    const holdMinutes = params.holdMinutes || 15
    const reservationId = `p_res_${params.bookingId}_${Date.now()}`
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString()

    const reservation: PointReservationEntity = {
      reservationId,
      bookingId: params.bookingId,
      customerId: params.customerId,
      pointsReserved: params.pointsReserved,
      valueEGP: params.valueEGP,
      status: 'held',
      configSnapshot: params.configSnapshot,
      expiresAt,
      createdAt: new Date().toISOString(),
    }

    this.activeReservations.set(reservationId, reservation)
    return reservation
  }

  /**
   * Commit reservation upon payment success.
   */
  commitReservation(reservationId: string): PointReservationEntity | undefined {
    const res = this.activeReservations.get(reservationId)
    if (res) {
      res.status = 'committed'
      return res
    }
    return undefined
  }

  /**
   * Release reservation upon checkout cancellation or payment failure.
   */
  releaseReservation(reservationId: string): PointReservationEntity | undefined {
    const res = this.activeReservations.get(reservationId)
    if (res) {
      res.status = 'released'
      this.activeReservations.delete(reservationId)
      return res
    }
    return undefined
  }

  /**
   * Get active total reserved points for a customer across open checkouts.
   */
  getCustomerActiveReservedPoints(customerId: number): number {
    const now = new Date().getTime()
    let total = 0

    for (const res of this.activeReservations.values()) {
      if (
        res.customerId === customerId &&
        res.status === 'held' &&
        new Date(res.expiresAt).getTime() > now
      ) {
        total += res.pointsReserved
      }
    }

    return total
  }

  /**
   * Find active reservation by booking ID.
   */
  findByBookingId(bookingId: number): PointReservationEntity | undefined {
    const now = new Date().getTime()
    return Array.from(this.activeReservations.values()).find(
      (r) =>
        r.bookingId === bookingId &&
        r.status === 'held' &&
        new Date(r.expiresAt).getTime() > now,
    )
  }

  // Stateless static methods for Booking Domain holds integration
  static createHold(params: {
    bookingId: number
    customerId: number
    pointsHeld: number
    valueEGP: number
    holdDurationMs?: number
  }): PointHoldEntity {
    const duration = params.holdDurationMs || 15 * 60 * 1000 // 15 mins
    const now = new Date()
    const expiresAt = new Date(now.getTime() + duration)

    return {
      holdId: `p_hold_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookingId: params.bookingId,
      customerId: params.customerId,
      pointsHeld: params.pointsHeld,
      valueEGP: params.valueEGP,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'held',
    }
  }

  static commitHold(hold: PointHoldEntity): PointHoldEntity {
    return {
      ...hold,
      status: 'committed',
    }
  }

  static releaseHold(hold: PointHoldEntity): PointHoldEntity {
    return {
      ...hold,
      status: 'released',
    }
  }

  static expireHold(hold: PointHoldEntity): PointHoldEntity {
    return {
      ...hold,
      status: 'expired',
    }
  }
}
