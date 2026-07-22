import type { PaymentAggregate } from './aggregate'
import type { PaymentPolicyResult } from './types'

/**
 * Pure Payment Policy
 * Single source of truth for pure business validation rules in the Payment Domain.
 * Provider-agnostic (Zero knowledge of Stripe, BNPL, or PayPal gateway specifics).
 */
export class PaymentPolicy {
  /**
   * Validate if a new payment checkout session can be created for a booking.
   */
  static canCreateSession(bookingStatus: string, displayAmount: number): PaymentPolicyResult {
    if (bookingStatus !== 'draft' && bookingStatus !== 'pending_payment') {
      return {
        allowed: false,
        code: 'INVALID_BOOKING_STATUS',
        reason: `Cannot create payment session for booking in '${bookingStatus}' status. Expected 'draft' or 'pending_payment'.`,
      }
    }

    if (displayAmount <= 0) {
      return {
        allowed: false,
        code: 'INVALID_AMOUNT',
        reason: 'Payment display amount must be greater than zero.',
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a gateway webhook event ID can be processed.
   */
  static canProcessWebhook(isAlreadyProcessed: boolean): PaymentPolicyResult {
    if (isAlreadyProcessed) {
      return {
        allowed: false,
        code: 'DUPLICATE_WEBHOOK_EVENT',
        reason: 'Webhook event ID has already been processed (Idempotency Guard).',
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a payment refund can be issued.
   */
  static canRefund(transaction: PaymentAggregate, requestedAmount: number): PaymentPolicyResult {
    if (transaction.status !== 'successful' && transaction.status !== 'partially_refunded') {
      return {
        allowed: false,
        code: 'TRANSACTION_NOT_SUCCESSFUL',
        reason: `Cannot refund transaction in '${transaction.status}' status. Must be 'successful' or 'partially_refunded'.`,
      }
    }

    const sessionAmount = transaction.session.sessionId ? transaction.attempts.find((a) => a.status === 'successful')?.amount || 0 : 0
    if (requestedAmount <= 0 || (sessionAmount > 0 && requestedAmount > sessionAmount)) {
      return {
        allowed: false,
        code: 'INVALID_REFUND_AMOUNT',
        reason: `Refund amount ${requestedAmount} is invalid for transaction value ${sessionAmount}.`,
      }
    }

    return { allowed: true }
  }
}
