import type { Payload } from 'payload'
import type { PaymentAggregate } from './aggregate'
import type { CreateSessionParams, PaymentProviderType, RefundParams, RefundResult } from './types'
import { PaymentRepository } from './repository'
import { SessionCreator } from './session-creator'
import { WebhookProcessor } from './webhook-processor'
import { RefundProcessor } from './refund-processor'
import { PaymentQueries } from './queries'
import type { IOutboxRepository } from '../events/contracts/outbox-repository.interface'

/**
 * Payment Workflow Engine
 * Central deterministic orchestrator for all payment lifecycle workflows via Constructor Dependency Injection.
 * Symmetrical architecture with BookingWorkflowEngine.
 */
export class PaymentWorkflowEngine {
  public repository: PaymentRepository
  public sessionCreator: SessionCreator
  public webhookProcessor: WebhookProcessor
  public refundProcessor: RefundProcessor
  public queries: PaymentQueries

  constructor(repository: PaymentRepository | Payload, outboxRepository?: IOutboxRepository) {
    if (repository && 'createTransaction' in repository) {
      this.repository = repository as PaymentRepository
    } else {
      this.repository = new PaymentRepository(repository as Payload)
    }
    this.sessionCreator = new SessionCreator(this.repository)
    this.webhookProcessor = new WebhookProcessor(this.repository, outboxRepository)
    this.refundProcessor = new RefundProcessor(this.repository)
    this.queries = new PaymentQueries(this.repository)
  }

  /**
   * Deterministic Create Session Workflow:
   * Policy -> Adapter -> Create Aggregate -> Persist
   */
  async executeCreateSessionWorkflow(
    provider: PaymentProviderType,
    params: CreateSessionParams,
    bookingStatus: string,
  ): Promise<PaymentAggregate> {
    return this.sessionCreator.createSession(provider, params, bookingStatus)
  }

  /**
   * Deterministic Stripe Webhook Processing Workflow
   */
  async executeWebhookWorkflow(
    rawBody: string | Buffer,
    signature: string,
    provider: PaymentProviderType = 'stripe',
    options?: { correlationId?: string; dbTransaction?: unknown },
  ): Promise<{ processed: boolean; transaction?: PaymentAggregate }> {
    return this.webhookProcessor.processStripeWebhook(rawBody, signature, provider, options)
  }

  /**
   * Deterministic Paymob Webhook Processing Workflow
   */
  async executePaymobWebhookWorkflow(
    rawBody: string | Buffer,
    signature: string,
    options?: { correlationId?: string; dbTransaction?: unknown },
  ): Promise<{ processed: boolean; transaction?: PaymentAggregate }> {
    return this.webhookProcessor.processPaymobWebhook(rawBody, signature, options)
  }

  /**
   * Deterministic Refund Workflow:
   * Policy -> Gateway Refund -> Append Attempt -> DB Status Update -> Emit PaymentRefundedEvent
   */
  async executeRefundWorkflow(
    params: RefundParams,
  ): Promise<{ result: RefundResult; transaction: PaymentAggregate }> {
    return this.refundProcessor.processRefund(params)
  }
}
