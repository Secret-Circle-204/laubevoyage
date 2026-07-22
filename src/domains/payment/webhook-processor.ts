import type { PaymentAggregate } from './aggregate'
import type { StripeWebhookPayload, PaymentProviderType } from './types'
import { PaymentRepository } from './repository'
import { PaymentPolicy } from './policy'
import { PaymentWebhookLedger } from './ledger'
import { PaymentAdapterFactory } from './adapters/factory'
import { EventBus } from '../events/event-bus'

/**
 * Webhook Processor Sub-Service
 * Idempotently processes gateway webhook callbacks and commits DB transaction before emitting events.
 */
export class WebhookProcessor {
  private repository: PaymentRepository
  private ledger: PaymentWebhookLedger
  private eventBus: EventBus

  constructor(repository: PaymentRepository) {
    this.repository = repository
    this.ledger = new PaymentWebhookLedger(repository)
    this.eventBus = EventBus.getInstance()
  }

  async processStripeWebhook(
    rawBody: string | Buffer,
    signature: string,
    provider: PaymentProviderType = 'stripe',
  ): Promise<{ processed: boolean; transaction?: PaymentAggregate }> {
    // 1. Verify signature via gateway adapter
    const adapter = PaymentAdapterFactory.resolve(provider)
    const payload: StripeWebhookPayload = await adapter.verifyWebhook(rawBody, signature)

    const eventId = payload.id
    const eventType = payload.type

    // 2. Check Database Webhook Ledger for Idempotency
    const isProcessed = await this.ledger.isProcessed(eventId)
    const policyResult = PaymentPolicy.canProcessWebhook(isProcessed)

    if (!policyResult.allowed) {
      console.log(`[WebhookProcessor] Idempotency Guard: Webhook event ${eventId} already processed. Skipping.`)
      return { processed: false }
    }

    // 3. Handle checkout completed event
    if (eventType === 'checkout.session.completed') {
      const sessionObj = payload.data.object
      const bookingIdRaw = sessionObj.metadata?.bookingId
      const transactionIdRaw = sessionObj.metadata?.transactionId
      const gatewayRef = sessionObj.payment_intent || sessionObj.id

      if (!bookingIdRaw) {
        throw new Error('[WebhookProcessor] Missing bookingId in metadata')
      }

      const bookingId = Number(bookingIdRaw)
      let transaction = transactionIdRaw
        ? await this.repository.findByTransactionId(transactionIdRaw)
        : await this.repository.findByBookingId(bookingId)

      if (!transaction) {
        throw new Error(`[WebhookProcessor] Payment transaction for booking #${bookingId} not found`)
      }

      // Record webhook entry
      const webhookRecord = {
        eventId,
        provider,
        eventType,
        bookingId,
        processedAt: new Date().toISOString(),
        status: 'processed' as const,
      }

      // Record successful payment attempt
      const attemptRecord = {
        attemptId: `att_${Date.now()}`,
        attemptNumber: transaction.attempts.length + 1,
        provider,
        amount: sessionObj.amount_total ? sessionObj.amount_total / 100 : transaction.session.sessionId ? 0 : 0,
        currency: (sessionObj.currency || 'EGP').toUpperCase(),
        status: 'successful' as const,
        transactionReference: gatewayRef || undefined,
        timestamp: new Date().toISOString(),
      }

      // Update state machine & append ledgers in repository
      await this.repository.appendAttempt(transaction.transactionId, attemptRecord)
      await this.ledger.recordProcessed(transaction.transactionId, webhookRecord)
      const updatedAggregate = await this.repository.updateStatus(transaction.transactionId, 'successful')

      // STRICT TRANSACTION BOUNDARY RULE:
      // Only emit PaymentCompletedEvent AFTER database commit completes!
      await this.eventBus.publish({
        type: 'PAYMENT_COMPLETED',
        transactionId: updatedAggregate.transactionId,
        bookingId: updatedAggregate.bookingId,
        amount: updatedAggregate.attempts[updatedAggregate.attempts.length - 1]?.amount || 0,
        currency: updatedAggregate.attempts[updatedAggregate.attempts.length - 1]?.currency || 'EGP',
        gatewayReference: gatewayRef || undefined,
        timestamp: new Date().toISOString(),
      })

      return { processed: true, transaction: updatedAggregate }
    }

    return { processed: false }
  }
}
