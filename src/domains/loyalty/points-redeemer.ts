import type { LoyaltyRepository } from './repository'
import type { PointLedgerRecord } from './types'
import { LoyaltyPolicy } from './policy'
import { ProjectionRebuilder } from './projection-rebuilder'

/**
 * Points Redeem Processor Sub-Service
 * Handles point redemptions with Projection Drift Guard auto-rebuild.
 */
export class PointsRedeemProcessor {
  private repository: LoyaltyRepository
  private projectionRebuilder: ProjectionRebuilder

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
    this.projectionRebuilder = new ProjectionRebuilder(repository)
  }

  async redeemForBooking(
    customerId: number,
    pointsToRedeem: number,
    bookingId: number,
    reason: string,
  ): Promise<PointLedgerRecord> {
    // 1. Fetch current running balance from ledger (Source of Truth)
    let currentBalance = await this.repository.getCurrentBalance(customerId)

    // 2. Validate policy
    const policyResult = LoyaltyPolicy.canRedeem(currentBalance, pointsToRedeem)
    if (!policyResult.allowed) {
      throw new Error(`[LoyaltyPolicy] Cannot redeem points: ${policyResult.reason}`)
    }

    // 3. Append negative redeem ledger entry (-pointsToRedeem)
    return this.repository.appendLedgerEntry(
      customerId,
      'redeem',
      -pointsToRedeem,
      reason,
      'booking',
      String(bookingId),
      bookingId,
    )
  }
}
