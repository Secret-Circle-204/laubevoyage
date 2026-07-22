import type { LoyaltyRepository } from './repository'
import type { PointLedgerRecord } from './types'
import { LoyaltyPolicy } from './policy'
import { PointsCalculator } from './points-calculator'

/**
 * Points Earn Processor Sub-Service
 * Handles point earning calculations and ledger appending.
 */
export class PointsEarnProcessor {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async earnForBooking(
    customerId: number,
    amountSpentEGP: number,
    bookingId: number,
    bookingNumber: string,
  ): Promise<PointLedgerRecord> {
    const { aggregate } = await this.repository.getCustomerAggregate(customerId)

    const pointsToEarn = PointsCalculator.calculateEarnedPoints(amountSpentEGP, aggregate.tier)

    const policyResult = LoyaltyPolicy.canEarn(pointsToEarn)
    if (!policyResult.allowed) {
      throw new Error(`[LoyaltyPolicy] Cannot earn points: ${policyResult.reason}`)
    }

    const calculateExpiry = (): string => {
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      return d.toISOString()
    }

    return this.repository.appendLedgerEntry(
      customerId,
      'earn',
      pointsToEarn,
      `Earned ${pointsToEarn} points for booking #${bookingNumber}`,
      'booking',
      String(bookingId),
      bookingId,
      calculateExpiry(),
      { amountSpentEGP, tier: aggregate.tier },
    )
  }

  async grantWelcomeBonus(customerId: number): Promise<PointLedgerRecord> {
    const existingBonus = await this.repository.findLedgerByReference('system_welcome', String(customerId), 'welcome_bonus')
    const policyResult = LoyaltyPolicy.canClaimWelcomeBonus(!!existingBonus)

    if (!policyResult.allowed) {
      throw new Error(`[LoyaltyPolicy] Cannot grant welcome bonus: ${policyResult.reason}`)
    }

    return this.repository.appendLedgerEntry(
      customerId,
      'welcome_bonus',
      100,
      'Welcome bonus for registering email account',
      'system_welcome',
      String(customerId),
    )
  }
}
