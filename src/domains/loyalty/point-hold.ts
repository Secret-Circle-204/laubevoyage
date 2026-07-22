import type { PointHoldEntity, PointHoldStatus } from './types'

export interface CreatePointHoldParams {
  bookingId: number
  customerId: number
  pointsHeld: number
  valueEGP?: number
  holdMinutes?: number
}

/**
 * Point Hold Service
 * Manages point hold entity lifecycle during booking checkout.
 * Lifecycle: held -> committed (on payment success) or released/expired (on checkout cancellation/expiry).
 */
export class PointHoldService {
  private activeHolds: Map<string, PointHoldEntity> = new Map()

  /**
   * Static factory method for creating a point hold.
   */
  static createHold(params: CreatePointHoldParams): PointHoldEntity {
    const holdMinutes = params.holdMinutes || 15
    const holdId = `p_hold_${params.bookingId}_${Date.now()}`
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString()

    return {
      holdId,
      bookingId: params.bookingId,
      customerId: params.customerId,
      pointsHeld: params.pointsHeld,
      status: 'held',
      expiresAt,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Static method to commit a hold.
   */
  static commitHold(hold: PointHoldEntity | string): PointHoldEntity {
    if (typeof hold === 'string') {
      return {
        holdId: hold,
        bookingId: 0,
        customerId: 0,
        pointsHeld: 0,
        status: 'committed',
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
    }
    return { ...hold, status: 'committed' }
  }

  /**
   * Static method to release a hold.
   */
  static releaseHold(hold: PointHoldEntity | string): PointHoldEntity {
    if (typeof hold === 'string') {
      return {
        holdId: hold,
        bookingId: 0,
        customerId: 0,
        pointsHeld: 0,
        status: 'released',
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
    }
    return { ...hold, status: 'released' }
  }

  /**
   * Static method to expire a hold.
   */
  static expireHold(hold: PointHoldEntity | string): PointHoldEntity {
    if (typeof hold === 'string') {
      return {
        holdId: hold,
        bookingId: 0,
        customerId: 0,
        pointsHeld: 0,
        status: 'expired',
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
    }
    return { ...hold, status: 'expired' }
  }

  /**
   * Instance method to hold points.
   */
  holdPoints(bookingId: number, customerId: number, points: number, holdMinutes: number = 15): PointHoldEntity {
    const hold = PointHoldService.createHold({
      bookingId,
      customerId,
      pointsHeld: points,
      holdMinutes,
    })
    this.activeHolds.set(hold.holdId, hold)
    return hold
  }

  /**
   * Instance method to commit hold.
   */
  commitHold(holdId: string): PointHoldEntity {
    return PointHoldService.commitHold(holdId)
  }

  /**
   * Instance method to release hold.
   */
  releaseHold(holdId: string): PointHoldEntity {
    return PointHoldService.releaseHold(holdId)
  }

  /**
   * Instance method to expire hold.
   */
  expireHold(holdId: string): PointHoldEntity {
    return PointHoldService.expireHold(holdId)
  }

  /**
   * Find active hold by booking ID.
   */
  findByBookingId(bookingId: number): PointHoldEntity | undefined {
    return Array.from(this.activeHolds.values()).find(
      (h) => h.bookingId === bookingId && h.status === 'held',
    )
  }
}
