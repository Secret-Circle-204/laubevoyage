import type { PaymentAggregate } from './aggregate'
import type { StripeWebhookPayload, PaymentProviderType } from './types'
import { PaymentRepository } from './repository'
import { PaymentPolicy } from './policy'
import { PaymentWebhookLedger } from './ledger'
import { PaymentAdapterFactory } from './adapters/factory'
import { PaymentProviderFactory } from './factory/payment-provider-factory'
import { EventBus } from '../events/event-bus'
import type { IOutboxRepository } from '../events/contracts/outbox-repository.interface'
import type { RequestContext } from '@/types'
import { fromSmallestUnit } from '@/domains/currency/rounding'

/**
 * Webhook Processor Sub-Service
 * Idempotently processes gateway webhook callbacks (Stripe & Paymob) and commits DB transaction before emitting events.
 */
export class WebhookProcessor {
  private repository: PaymentRepository
  private ledger: PaymentWebhookLedger
  private eventBus: EventBus

  constructor(
    repository: PaymentRepository,
    private outboxRepository?: IOutboxRepository,
  ) {
    this.repository = repository
    this.ledger = new PaymentWebhookLedger(repository)
    this.eventBus = EventBus.getInstance()
  }

  async processStripeWebhook(
    rawBody: string | Buffer,
    signature: string,
    provider: PaymentProviderType = 'stripe',
    options?: { correlationId?: string; dbTransaction?: unknown },
  ): Promise<{ processed: boolean; transaction?: PaymentAggregate }> {
    const adapter = PaymentAdapterFactory.resolve(provider)
    const payload: StripeWebhookPayload = await adapter.verifyWebhook(rawBody, signature)

    const eventId = payload.id
    const eventType = payload.type
    console.log(
      `[WebhookProcessor] 📡 Received Stripe webhook event ${eventId} (Type: ${eventType})`,
    )

    const isProcessed = await this.ledger.isProcessed(eventId)
    const policyResult = PaymentPolicy.canProcessWebhook(isProcessed)

    if (!policyResult.allowed) {
      console.log(
        `[WebhookProcessor] Idempotency Guard: Webhook event ${eventId} already processed. Skipping.`,
      )
      return { processed: false }
    }

    if (eventType === 'checkout.session.completed') {
      const sessionObj = payload.data.object
      const bookingIdRaw = sessionObj.metadata?.bookingId
      const transactionIdRaw = sessionObj.metadata?.transactionId
      const customerEmail = sessionObj.customer_details?.email || sessionObj.customer_email || undefined
      const gatewayRef = sessionObj.payment_intent || sessionObj.id

      if (!bookingIdRaw) {
        throw new Error('[WebhookProcessor] Missing required bookingId in Stripe metadata.')
      }

      if (!sessionObj.currency) {
        throw new Error('[WebhookProcessor] Missing currency in Stripe session details.')
      }
      const currency = sessionObj.currency.toUpperCase()

      if (sessionObj.amount_total === null || sessionObj.amount_total === undefined) {
        throw new Error('[WebhookProcessor] Missing amount_total in Stripe session details.')
      }
      const amount = await fromSmallestUnit(sessionObj.amount_total, currency)

      const bookingId = Number(bookingIdRaw)
      console.log(
        `[WebhookProcessor] 💳 checkout.session.completed processing for Booking #${bookingId}, CustomerEmail: ${customerEmail || 'undefined'}`,
      )

      const context: RequestContext = {
        transactionId: options?.dbTransaction
          ? (options.dbTransaction as any).transactionID
          : undefined,
      }

      const transaction = transactionIdRaw
        ? await this.repository.findByTransactionId(transactionIdRaw, context)
        : await this.repository.findByBookingId(bookingId, context)

      if (!transaction) {
        throw new Error(
          `[WebhookProcessor] Payment transaction for booking #${bookingId} not found.`,
        )
      }

      const webhookRecord = {
        eventId,
        provider,
        eventType,
        bookingId,
        processedAt: new Date().toISOString(),
        status: 'processed' as const,
      }

      const attemptNumber = transaction.attempts.length + 1
      const attemptId = `att_stripe_${eventId}_${attemptNumber}`
      const attemptRecord = {
        attemptId,
        attemptNumber,
        provider,
        amount,
        currency,
        status: 'successful' as const,
        transactionReference: gatewayRef || undefined,
        timestamp: new Date().toISOString(),
      }

      console.log(
        `[WebhookProcessor] 📝 Appending payment attempt and recording processed webhook for Transaction: ${transaction.transactionId}`,
      )
      await this.repository.appendAttempt(transaction.transactionId, attemptRecord, context)
      await this.ledger.recordProcessed(transaction.transactionId, webhookRecord, context)
      const updatedAggregate = await this.repository.updateStatus(
        transaction.transactionId,
        'successful',
        context,
      )

      const correlationId =
        options?.correlationId ||
        (sessionObj.metadata as any)?.correlationId ||
        `corr_stripe_${Date.now()}`
      const paymentCompletedEvent = {
        type: 'PAYMENT_COMPLETED' as const,
        eventId: `evt_stripe_${eventId}`,
        correlationId,
        eventVersion: 1,
        occurredAt: payload.created ? new Date(payload.created * 1000).toISOString() : undefined,
        aggregateType: 'Payment',
        aggregateId: updatedAggregate.transactionId,
        transactionId: updatedAggregate.transactionId,
        bookingId: updatedAggregate.bookingId,
        customerId: updatedAggregate.customerId,
        customerEmail,
        provider: 'stripe' as const,
        amount,
        currency,
        gatewayReference: gatewayRef || undefined,
        attemptId,
        attemptNumber,
      }

      if (this.outboxRepository) {
        console.log(
          `[WebhookProcessor] 📤 Queueing PAYMENT_COMPLETED event into Outbox (EventID: ${paymentCompletedEvent.eventId})`,
        )
        await this.outboxRepository.add(paymentCompletedEvent, options?.dbTransaction)
      } else {
        console.log(
          `[WebhookProcessor] 📢 Publishing PAYMENT_COMPLETED event directly to EventBus (EventID: ${paymentCompletedEvent.eventId})`,
        )
        await this.eventBus.publish(paymentCompletedEvent)
      }

      return { processed: true, transaction: updatedAggregate }
    }

    return { processed: false }
  }

  async processPaymobWebhook(
    rawBody: string | Buffer,
    signature: string,
    options?: { correlationId?: string; dbTransaction?: unknown },
  ): Promise<{ processed: boolean; transaction?: PaymentAggregate }> {
    const paymobProvider = PaymentProviderFactory.getProvider('paymob')
    const isValid = paymobProvider.verifyWebhookSignature(rawBody, signature)
    if (!isValid) {
      throw new Error('[WebhookProcessor] Invalid Paymob HMAC signature.')
    }

    const payload = paymobProvider.parseWebhookPayload(rawBody)
    const eventId = payload.eventId
    const bookingId = payload.bookingId

    if (!bookingId) {
      throw new Error('[WebhookProcessor] Paymob webhook payload missing required bookingId.')
    }

    const context: RequestContext = {
      transactionId: options?.dbTransaction
        ? (options.dbTransaction as any).transactionID
        : undefined,
    }

    const isProcessed = await this.ledger.isProcessed(eventId, context)
    const policyResult = PaymentPolicy.canProcessWebhook(isProcessed)

    if (!policyResult.allowed) {
      console.log(
        `[WebhookProcessor] Idempotency Guard: Paymob event ${eventId} already processed. Skipping.`,
      )
      return { processed: false }
    }

    let transaction = await this.repository.findByBookingId(bookingId, context)
    if (!transaction) {
      transaction = await this.repository.createTransaction(
        {
          bookingId,
          customerId: 0,
          provider: 'paymob' as any,
          status: 'pending',
          session: { sessionId: `paymob_${eventId}`, url: '' },
        },
        context,
      )
    }

    if (!transaction) {
      throw new Error(`[WebhookProcessor] Paymob transaction not found and creation failed.`)
    }

    const webhookRecord = {
      eventId,
      provider: 'paymob' as any,
      eventType: payload.eventType,
      bookingId,
      processedAt: new Date().toISOString(),
      status: 'processed' as const,
    }

    const attemptNumber = transaction.attempts.length + 1
    const attemptId = `att_paymob_${eventId}_${attemptNumber}`
    const attemptRecord = {
      attemptId,
      attemptNumber,
      provider: 'paymob' as any,
      amount: 0,
      currency: 'EGP',
      status: 'successful' as const,
      transactionReference: payload.transactionId || eventId,
      timestamp: new Date().toISOString(),
    }

    await this.repository.appendAttempt(transaction.transactionId, attemptRecord, context)
    await this.ledger.recordProcessed(transaction.transactionId, webhookRecord, context)
    const updatedAggregate = await this.repository.updateStatus(
      transaction.transactionId,
      'successful',
      context,
    )

    const correlationId = options?.correlationId || `corr_paymob_${Date.now()}`
    const paymentCompletedEvent = {
      type: 'PAYMENT_COMPLETED' as const,
      eventId: `evt_paymob_${eventId}`,
      correlationId,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      aggregateType: 'Payment',
      aggregateId: updatedAggregate.transactionId,
      transactionId: updatedAggregate.transactionId,
      bookingId: updatedAggregate.bookingId,
      customerId: updatedAggregate.customerId,
      customerEmail: 'customer@laube.com', // Resolved dynamically by subscriber if customer document exists
      provider: 'paymob' as any,
      amount: attemptRecord.amount,
      currency: attemptRecord.currency,
      gatewayReference: attemptRecord.transactionReference,
      attemptId,
      attemptNumber,
    }

    if (this.outboxRepository) {
      await this.outboxRepository.add(paymentCompletedEvent, options?.dbTransaction)
    } else {
      await this.eventBus.publish(paymentCompletedEvent)
    }

    return { processed: true, transaction: updatedAggregate }
  }
}
