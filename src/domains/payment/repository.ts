import type { Payload, PayloadRequest } from 'payload'
import type { PaymentAggregate } from './aggregate'
import type { PaymentStatusType, PaymentAttemptRecord, WebhookLedgerRecord, PaymentAuditRecord } from './types'
import { validatePaymentTransition } from './state-machine'
import type { RequestContext } from '@/types'

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

  /**
   * Start a database transaction.
   */
  async beginTransaction(): Promise<string | number | null> {
    if (this.payload?.db && typeof this.payload.db.beginTransaction === 'function') {
      return this.payload.db.beginTransaction()
    }
    return null
  }

  /**
   * Commit a database transaction.
   */
  async commitTransaction(transactionID: string | number | null): Promise<void> {
    if (
      transactionID !== null &&
      transactionID !== undefined &&
      this.payload?.db &&
      typeof this.payload.db.commitTransaction === 'function'
    ) {
      await this.payload.db.commitTransaction(transactionID)
    }
  }

  /**
   * Rollback a database transaction.
   */
  async rollbackTransaction(transactionID: string | number | null): Promise<void> {
    if (
      transactionID !== null &&
      transactionID !== undefined &&
      this.payload?.db &&
      typeof this.payload.db.rollbackTransaction === 'function'
    ) {
      await this.payload.db.rollbackTransaction(transactionID)
    }
  }

  private mapContextToReq(context?: RequestContext): PayloadRequest | undefined {
    if (!context || context.transactionId === null || context.transactionId === undefined) {
      return undefined
    }
    return {
      transactionID: context.transactionId,
    } as unknown as PayloadRequest
  }

  async findActiveGateways() {
    return [
      { id: 'stripe', name: 'Credit / Debit Card (Stripe)', icon: 'card', isAvailable: true },
      { id: 'bnpl', name: 'Buy Now Pay Later', icon: 'clock', isAvailable: true },
    ]
  }

  /**
   * Create a new payment transaction aggregate document.
   */
  async createTransaction(data: Record<string, unknown>, context?: RequestContext): Promise<PaymentAggregate> {
    const req = this.mapContextToReq(context)
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
  async findByTransactionId(transactionId: string, context?: RequestContext): Promise<PaymentAggregate | null> {
    const req = this.mapContextToReq(context)
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
  async findByBookingId(bookingId: number, context?: RequestContext): Promise<PaymentAggregate | null> {
    const req = this.mapContextToReq(context)
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
   * Find multiple payment aggregates matching a set of booking IDs in a single query.
   */
  async findManyByBookingIds(bookingIds: number[], context?: RequestContext): Promise<PaymentAggregate[]> {
    const req = this.mapContextToReq(context)
    if (bookingIds.length === 0) return []
    const result = await this.payload.find({
      collection: 'payment-transactions',
      where: {
        bookingId: { in: bookingIds },
      },
      limit: bookingIds.length,
      req,
    })

    return result.docs.map((doc) => this.mapDocToAggregate(doc))
  }

  /**
   * Find paginated payment transactions for a customer with optional DB status filtering.
   */
  async findByCustomerId(
    customerId: number,
    page: number = 1,
    limit: number = 10,
    filters?: { status?: PaymentStatusType },
    context?: RequestContext,
  ): Promise<import('@/types').PaginatedResponse<PaymentAggregate>> {
    const req = this.mapContextToReq(context)
    const where: any = {
      customerId: { equals: customerId },
    }
    if (filters?.status) {
      where.status = { equals: filters.status }
    }

    const result = await this.payload.find({
      collection: 'payment-transactions',
      where,
      page,
      limit,
      sort: '-createdAt',
      req,
    })

    return {
      data: result.docs.map((doc) => this.mapDocToAggregate(doc)),
      total: result.totalDocs,
      page: result.page || page,
      totalPages: result.totalPages || 1,
      limit: result.limit || limit,
    }
  }


  /**
   * Find payment aggregate by gateway reference (e.g. Stripe Session ID or PaymentIntent ID).
   */
  async findByGatewayReference(gatewayReference: string, context?: RequestContext): Promise<PaymentAggregate | null> {
    const req = this.mapContextToReq(context)
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
   * Enforces true Optimistic Concurrency Control (OCC) using conditional database writes.
   * If expectedVersion is specified (or deduced from current version), the update fails
   * if a concurrent writer updated the record.
   * Atomically persists status, version, and optional audit record in a single database write.
   */
  async updateStatus(
    transactionId: string,
    newStatus: PaymentStatusType,
    context?: RequestContext,
    auditRecord?: PaymentAuditRecord,
    expectedVersion?: number,
  ): Promise<PaymentAggregate> {
    const req = this.mapContextToReq(context)
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

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new Error(
        `[PaymentRepository] Optimistic lock conflict: Transaction ${transactionId} version mismatch (expected version ${expectedVersion}, current version is ${current.version}). Concurrency conflict prevented lost update.`,
      )
    }

    validatePaymentTransition(current.status, newStatus)

    const targetVersion = expectedVersion !== undefined ? expectedVersion : current.version

    const updateData: {
      status: PaymentStatusType
      version: number
      auditTrail?: PaymentAuditRecord[]
    } = {
      status: newStatus,
      version: targetVersion + 1,
    }

    if (auditRecord) {
      updateData.auditTrail = [...(current.auditTrail || []), auditRecord]
    }

    const updateResult = await this.payload.update({
      collection: 'payment-transactions',
      where: {
        and: [
          { transactionId: { equals: transactionId } },
          { version: { equals: targetVersion } },
        ],
      },
      data: updateData as unknown as Record<string, unknown>,
      req,
    })

    const updatedDoc =
      updateResult && typeof updateResult === 'object' && 'docs' in updateResult
        ? updateResult.docs?.[0]
        : updateResult

    if (!updatedDoc) {
      throw new Error(
        `[PaymentRepository] Optimistic lock conflict: Transaction ${transactionId} version mismatch (expected version ${targetVersion}). Concurrency conflict prevented lost update.`,
      )
    }

    return this.mapDocToAggregate(updatedDoc)
  }

  /**
   * Append a new payment attempt record to aggregate attempt ledger.
   */
  async appendAttempt(
    transactionId: string,
    attempt: PaymentAttemptRecord,
    context?: RequestContext,
  ): Promise<PaymentAggregate> {
    const req = this.mapContextToReq(context)
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
    context?: RequestContext,
  ): Promise<PaymentAggregate> {
    const req = this.mapContextToReq(context)
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
   * Append an audit record to database audit trail with Optimistic Concurrency Control.
   */
  async appendAudit(
    transactionId: string,
    auditRecord: PaymentAuditRecord,
    context?: RequestContext,
    expectedVersion?: number,
  ): Promise<PaymentAggregate> {
    const req = this.mapContextToReq(context)
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

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new Error(
        `[PaymentRepository] Optimistic lock conflict: Transaction ${transactionId} version mismatch (expected version ${expectedVersion}, current version is ${current.version}) while appending audit record. Concurrency conflict prevented lost update.`,
      )
    }

    const targetVersion = expectedVersion !== undefined ? expectedVersion : current.version
    const updatedAudit = [...(current.auditTrail || []), auditRecord]

    const updateResult = await this.payload.update({
      collection: 'payment-transactions',
      where: {
        and: [
          { transactionId: { equals: transactionId } },
          { version: { equals: targetVersion } },
        ],
      },
      data: {
        auditTrail: updatedAudit as unknown as Record<string, unknown>[],
        version: targetVersion + 1,
      } as unknown as Record<string, unknown>,
      req,
    })

    const updatedDoc =
      updateResult && typeof updateResult === 'object' && 'docs' in updateResult
        ? updateResult.docs?.[0]
        : updateResult

    if (!updatedDoc) {
      throw new Error(
        `[PaymentRepository] Optimistic lock conflict: Transaction ${transactionId} version mismatch (expected version ${targetVersion}) while appending audit record. Concurrency conflict prevented lost update.`,
      )
    }

    return this.mapDocToAggregate(updatedDoc)
  }

  /**
   * Check if a webhook event ID was already processed in the database.
   */
  async findWebhookByEventId(eventId: string, context?: RequestContext): Promise<WebhookLedgerRecord | null> {
    const req = this.mapContextToReq(context)
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
  async findPendingTransactions(context?: RequestContext): Promise<PaymentAggregate[]> {
    const req = this.mapContextToReq(context)
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
