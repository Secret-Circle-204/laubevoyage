import type { LedgerEntryType } from './types'
import {
  FinancialInvariantException,
  InsufficientPointsException,
} from '@/domains/shared/exceptions/domain-exception'

/**
 * Strict Ledger Validator
 * Enforces pre-commit financial invariants on all ledger entries.
 * @throws FinancialInvariantException | InsufficientPointsException if invariants are violated.
 */
export class LedgerValidator {
  static validateLedgerEntry(type: LedgerEntryType, points: number, currentBalance: number): void {
    const positiveTypes: LedgerEntryType[] = ['earn', 'earned', 'refund', 'refunded', 'welcome_bonus', 'tier_bonus']
    const negativeTypes: LedgerEntryType[] = ['redeem', 'redeemed', 'reverse', 'reversed', 'expiration', 'expired']

    if (positiveTypes.includes(type) && points < 0) {
      throw new FinancialInvariantException(
        `[LedgerValidator] Financial Invariant Violation: Entry type "${type}" must have non-negative points value. Received: ${points}`,
      )
    }

    if (negativeTypes.includes(type) && points > 0) {
      throw new FinancialInvariantException(
        `[LedgerValidator] Financial Invariant Violation: Entry type "${type}" must have non-positive points value. Received: ${points}`,
      )
    }

    if (negativeTypes.includes(type)) {
      const resulting = currentBalance + points // points is negative
      if (resulting < 0) {
        throw new FinancialInvariantException(
          `[LedgerValidator] Insufficient Funds: Balance would drop below zero (${resulting}) for entry type "${type}".`,
        )
      }
    }
  }
}

