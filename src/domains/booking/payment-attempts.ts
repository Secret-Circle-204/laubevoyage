import type { PaymentAttempt } from './types'

/**
 * Payment Attempts Service
 * Records and maintains an immutable ledger of all payment attempts for a booking.
 */
export class PaymentAttemptsService {
  /**
   * Append a new payment attempt record to the attempts ledger.
   */
  static recordAttempt(
    existingAttempts: PaymentAttempt[] = [],
    params: {
      provider: 'stripe' | 'bnpl' | 'manual'
      amount: number
      currency: string
      status: 'initiated' | 'successful' | 'failed' | 'timed_out'
      transactionReference?: string
      failureReason?: string
    },
  ): PaymentAttempt[] {
    const nextAttemptNumber = existingAttempts.length + 1
    const newAttempt: PaymentAttempt = {
      attemptId: `pay_att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      attemptNumber: nextAttemptNumber,
      provider: params.provider,
      amount: params.amount,
      currency: params.currency,
      status: params.status,
      transactionReference: params.transactionReference,
      failureReason: params.failureReason,
      timestamp: new Date().toISOString(),
    }

    return [...existingAttempts, newAttempt]
  }

  /**
   * Sum successful payment attempts to calculate total paid amount.
   */
  static getPaidAmount(attempts: PaymentAttempt[] = []): number {
    return attempts
      .filter((a) => a.status === 'successful')
      .reduce((sum, a) => sum + a.amount, 0)
  }

  /**
   * Compute outstanding balance as total EGP minus sum of successful attempts.
   */
  static getOutstandingBalance(totalAmountEGP: number, attempts: PaymentAttempt[] = []): number {
    const paid = this.getPaidAmount(attempts)
    return Math.max(0, totalAmountEGP - paid)
  }
}
