import type { LoyaltyRepository } from './repository'
import type { PointLedgerRecord } from './types'
import { PointsCalculator } from './points-calculator'
import type { LoyaltyProgramConfig, LeanRulesSnapshot } from './tier-config'
import type { RequestContext } from '@/types'

/**
 * Points Redeem Processor Sub-Service
 * Handles point redemptions with FIFO Consumption Strategy and dynamic LoyaltyProgramConfig validation.
 * Prioritizes deducting points from the oldest unexpired earned ledger entries.
 */
export class PointsRedeemProcessor {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async redeemForBooking(
    customerId: number,
    pointsToRedeem: number,
    bookingId: number,
    bookingTotalEGP: number,
    config: LoyaltyProgramConfig,
    reason?: string,
    context?: RequestContext,
  ): Promise<PointLedgerRecord> {
    // 1. Fetch current running balance from ledger
    const currentBalance = await this.repository.getCurrentBalance(customerId, context)

    // 2. Validate redemption against business policy and Wallet economics
    const policyResult = PointsCalculator.validateRedemptionAmount(
      pointsToRedeem,
      currentBalance,
      bookingTotalEGP,
      config,
    )
    if (!policyResult.allowed) {
      throw new Error(`[PointsRedeemProcessor] Cannot redeem points: ${policyResult.reason}`)
    }

    // 3. FIFO Consumption Strategy: Fetch ledger history to trace oldest earned entries
    const ledgerHistory = await this.repository.getLedgerHistory(customerId, 100, context)
    const earnedEntries = ledgerHistory
      .filter((e) => e.points > 0 && e.type !== 'expiration')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    let remainingToDeduct = pointsToRedeem
    const consumedLedgerIds: string[] = []

    for (const entry of earnedEntries) {
      if (remainingToDeduct <= 0) break
      consumedLedgerIds.push(entry.id)
      remainingToDeduct -= entry.points
    }

    const leanSnapshot: LeanRulesSnapshot = {
      baseEarnRate: config.baseEarnRate,
      tierMultiplier: 1.0,
      redemptionPointsUnit: config.redemptionPointsUnit,
      redemptionValueEGP: config.redemptionValueEGP,
      welcomeBonus: config.welcomeBonus,
    }

    // 4. Append negative redeem ledger entry (-pointsToRedeem)
    return this.repository.appendLedgerEntry(
      customerId,
      'redeem',
      -pointsToRedeem,
      reason || `Redeemed ${pointsToRedeem} points for booking #${bookingId}`,
      'booking',
      String(bookingId),
      bookingId,
      undefined,
      {
        programId: config.id,
        programCode: config.programCode,
        programVersion: config.version,
        consumptionStrategy: 'fifo',
        consumedLedgerIds,
        rulesSnapshot: leanSnapshot,
      },
      context,
    )
  }
}
