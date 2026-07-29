import type { PaymentAggregate } from './aggregate'
import type { RefundParams, RefundResult } from './types'
import { PaymentRepository } from './repository'
import { PaymentPolicy } from './policy'
import { PaymentAdapterFactory } from './adapters/factory'
import { EventBus } from '../events/event-bus'

/**
 * Refund Processor Sub-Service
 * Manages gateway refunds, policy validation, attempt ledger updates, and PaymentRefundedEvent.
 */
export class RefundProcessor {
  private repository: PaymentRepository
  private eventBus: EventBus

  constructor(repository: PaymentRepository) {
    this.repository = repository
    this.eventBus = EventBus.getInstance()
  }

  async processRefund(params: RefundParams): Promise<{ result: RefundResult; transaction: PaymentAggregate }> {
    const transaction = await this.repository.findByTransactionId(params.transactionId)
    if (!transaction) {
      throw new Error(`[RefundProcessor] Transaction ID ${params.transactionId} not found`)
    }

    // 1. Validate refund policy
    const policyResult = PaymentPolicy.canRefund(transaction, params.amount)
    if (!policyResult.allowed) {
      throw new Error(`[PaymentPolicy] Refund forbidden: ${policyResult.reason}`)
    }

    // 2. Resolve adapter & execute gateway refund
    const adapter = PaymentAdapterFactory.resolve(transaction.provider)
    const refundResult = await adapter.refund(params)

    if (!refundResult.success) {
      throw new Error(`[RefundProcessor] Gateway refund failed: ${refundResult.error}`)
    }

    // 3. Record attempt & update transaction status in repository
    const attemptRecord = {
      attemptId: `ref_att_${Date.now()}`,
      attemptNumber: transaction.attempts.length + 1,
      provider: transaction.provider,
      amount: -params.amount,
      currency: params.currency,
      status: 'successful' as const,
      transactionReference: refundResult.refundId,
      timestamp: new Date().toISOString(),
    }

    await this.repository.appendAttempt(transaction.transactionId, attemptRecord)
    const updatedTransaction = await this.repository.updateStatus(transaction.transactionId, 'refunded')

    // 4. Emit PaymentRefundedEvent after DB commit
    await this.eventBus.publish({
      eventId: `evt_pay_ref_${updatedTransaction.transactionId}_${Date.now()}`,
      correlationId: `corr_${updatedTransaction.bookingId}`,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      type: 'PAYMENT_REFUNDED',
      transactionId: updatedTransaction.transactionId,
      bookingId: updatedTransaction.bookingId,
      amountRefunded: params.amount,
      currency: params.currency,
      timestamp: new Date().toISOString(),
    })

    return { result: refundResult, transaction: updatedTransaction }
  }
}
