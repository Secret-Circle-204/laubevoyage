import type { LoyaltyRepository } from './repository'
import type { PointLedgerRecord } from './types'
import type { RequestContext } from '@/types'

/**
 * Points Refund Processor Sub-Service
 * Handles restoring redeemed points and reversing earned points upon booking cancellation.
 */
export class PointsRefundProcessor {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async refundRedeemedPoints(
    customerId: number,
    pointsToRefund: number,
    bookingId: number,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    return this.repository.appendLedgerEntry(
      customerId,
      'refund',
      pointsToRefund,
      `Refund for cancelled booking #${bookingId}`,
      'booking',
      String(bookingId),
      bookingId,
      undefined,
      undefined,
      context,
    )
  }

  async reverseEarnedPoints(
    customerId: number,
    pointsToReverse: number,
    bookingId: number,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    return this.repository.appendLedgerEntry(
      customerId,
      'reverse',
      -pointsToReverse,
      `Reversal of earned points for cancelled booking #${bookingId}`,
      'booking',
      String(bookingId),
      bookingId,
      undefined,
      undefined,
      context,
    )
  }
}
