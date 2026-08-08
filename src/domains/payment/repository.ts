import type { Payload, PayloadRequest } from 'payload'
import type { PaymentAggregate } from './aggregate'
import type { PaymentStatusType, PaymentAttemptRecord, WebhookLedgerRecord } from './types'
import { validatePaymentTransition } from './state-machine'

/**
 * Payment Repository
 * Sole data persistence layer for the Payment Domain.
 * Intercepts all database queries for the 'payment-transactions' collection.
 */
export class PaymentRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findActiveGateways() {
    return [
      { id: 'stripe', name: 'Credit / Debit Card (Stripe)', icon: '💳', isAvailable: true },
      { id: 'bnpl', name: 'Buy Now Pay Later', icon: '⚡', isAvailable: true },
    ]
  }

  /**
   * Create a new payment transaction aggregate document.
   */
  async createTransaction(data: Record<string, unknown>, req?: PayloadRequest): Promise<PaymentAggregate> {
    const doc = await this.payload.create({
      collection: 'payment-transactions',
      data: data as unknown as Record<string, any>,
      req,
    } as any)

    return this.mapDocToAggregate(doc)
  }

  /**
   * Find payment aggregate by unique transaction ID.
   */
  async findByTransactionId(transactionId: string, req?: PayloadRequest): Promise<PaymentAggregate | null> {
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        transactionId: { equals: transactionId },
      },
      limit: 1,
      req,
    })

    const doc = result.docs[0]
    return doc ? this.mapDocToAggregate(doc) : null
  }

  /**
   * Find payment aggregate by booking ID.
   */
  async findByBookingId(bookingId: number, req?: PayloadRequest): Promise<PaymentAggregate | null> {
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        bookingId: { equals: bookingId },
      },
      limit: 1,
      req,
    })

    const doc = result.docs[0]
    return doc ? this.mapDocToAggregate(doc) : null
  }

  /**
   * Find payment aggregate by gateway reference (e.g. Stripe Session ID or PaymentIntent ID).
   */
  async findByGatewayReference(gatewayReference: string, req?: PayloadRequest): Promise<PaymentAggregate | null> {
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        gatewayReference: { equals: gatewayReference },
      },
      limit: 1,
      req,
    })

    const doc = result.docs[0]
    return doc ? this.mapDocToAggregate(doc) : null
  }

  /**
   * Update payment transaction status exclusively with State Machine validation.
   */
  async updateStatus(
    transactionId: string,
    newStatus: PaymentStatusType,
    req?: PayloadRequest,
  ): Promise<PaymentAggregate> {
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        transactionId: { equals: transactionId },
      },
      limit: 1,
      req,
    })

    const currentDoc = result.docs[0]
    if (!currentDoc) {
      throw new Error(`[PaymentRepository] Transaction ID ${transactionId} not found`)
    }

    const current = this.mapDocToAggregate(currentDoc)
    validatePaymentTransition(current.status, newStatus)

    const updatedDoc = await this.payload.update({
      collection: 'payment-transactions',
      id: currentDoc.id,
      data: {
        status: newStatus as PaymentStatusType,
        version: current.version + 1,
      },
      req,
    })

    return this.mapDocToAggregate(updatedDoc)
  }

  /**
   * Append a new payment attempt record to aggregate attempt ledger.
   */
  async appendAttempt(
    transactionId: string,
    attempt: PaymentAttemptRecord,
    req?: PayloadRequest,
  ): Promise<PaymentAggregate> {
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        transactionId: { equals: transactionId },
      },
      limit: 1,
      req,
    })

    const currentDoc = result.docs[0]
    if (!currentDoc) {
      throw new Error(`[PaymentRepository] Transaction ID ${transactionId} not found`)
    }

    const current = this.mapDocToAggregate(currentDoc)
    const updatedAttempts = [...current.attempts, attempt]

    const updatedDoc = await this.payload.update({
      collection: 'payment-transactions',
      id: currentDoc.id,
      data: {
        attempts: updatedAttempts as unknown as Record<string, any>[],
        gatewayReference: attempt.transactionReference || current.gatewayReference,
        version: current.version + 1,
      },
      req,
    })

    return this.mapDocToAggregate(updatedDoc)
  }

  /**
   * Append a processed webhook record to database webhook ledger.
   */
  async appendWebhook(
    transactionId: string,
    webhook: WebhookLedgerRecord,
    req?: PayloadRequest,
  ): Promise<PaymentAggregate> {
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        transactionId: { equals: transactionId },
      },
      limit: 1,
      req,
    })

    const currentDoc = result.docs[0]
    if (!currentDoc) {
      throw new Error(`[PaymentRepository] Transaction ID ${transactionId} not found`)
    }

    const current = this.mapDocToAggregate(currentDoc)
    const updatedLedger = [...current.webhookLedger, webhook]

    const updatedDoc = await this.payload.update({
      collection: 'payment-transactions',
      id: currentDoc.id,
      data: {
        webhookLedger: updatedLedger as unknown as Record<string, any>[],
        version: current.version + 1,
      },
      req,
    })

    return this.mapDocToAggregate(updatedDoc)
  }

  /**
   * Check if a webhook event ID was already processed in the database.
   */
  async findWebhookByEventId(eventId: string, req?: PayloadRequest): Promise<WebhookLedgerRecord | null> {
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        'webhookLedger.eventId': { equals: eventId },
      },
      limit: 1,
      req,
    })

    if (!result.docs[0]) return null

    const aggregate = this.mapDocToAggregate(result.docs[0])
    const foundRecord = aggregate.webhookLedger.find((record) => record.eventId === eventId)
    return foundRecord || null
  }

  /**
   * Find all payment transactions in 'initiated' or 'pending' state.
   */
  async findPendingTransactions(req?: PayloadRequest): Promise<PaymentAggregate[]> {
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        status: { equals: 'initiated' },
      },
      limit: 100,
      req,
    })

    return result.docs.map((doc) => this.mapDocToAggregate(doc))
  }

  /**
   * Map Payload document to strongly-typed PaymentAggregate.
   */
  private mapDocToAggregate(doc: Record<string, any>): PaymentAggregate {
    return {
      transactionId: doc.transactionId || String(doc.id),
      bookingId: Number(doc.bookingId),
      customerId: Number(doc.customerId),
      version: doc.version || 1,
      provider: doc.provider || 'stripe',
      status: doc.status as PaymentStatusType,
      session: doc.session || { sessionId: '' },
      attempts: doc.attempts || [],
      webhookLedger: doc.webhookLedger || [],
      auditTrail: doc.auditTrail || [],
      gatewayReference: doc.gatewayReference,
      createdAt: doc.createdAt ? (typeof doc.createdAt === 'string' ? doc.createdAt : new Date(doc.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: doc.updatedAt ? (typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date(doc.updatedAt).toISOString()) : new Date().toISOString(),
    }
  }
}
