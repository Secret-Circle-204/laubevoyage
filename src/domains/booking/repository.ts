import type { Payload, PayloadRequest } from 'payload'
import type { BookingStatus, PaginatedResponse, RequestContext } from '@/types'
import type {
  BookingAggregate,
  CustomerTripSummary,
  CapacityHoldEntity,
  PointHoldEntity,
  PaymentAttempt,
  CustomerTimelineEntry,
  SystemAuditEntry,
  PricingSnapshotData,
} from './types'
import type { Booking } from '@/payload-types'
import { validateTransition } from './state-machine'

/**
 * Booking Repository
 * Sole data persistence layer for the Booking Domain.
 * All database operations for the 'bookings' collection MUST pass through this repository.
 */
export class BookingRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Get the underlying typed Payload instance.
   */
  getPayloadInstance(): Payload {
    return this.payload
  }

  /**
   * Start a database transaction.
   */
  async beginTransaction(): Promise<string | number | null> {
    return this.payload.db.beginTransaction()
  }

  /**
   * Commit a database transaction.
   */
  async commitTransaction(transactionID: string | number | null): Promise<void> {
    if (transactionID !== null && transactionID !== undefined) {
      await this.payload.db.commitTransaction(transactionID)
    }
  }

  /**
   * Rollback a database transaction.
   */
  async rollbackTransaction(transactionID: string | number | null): Promise<void> {
    if (transactionID !== null && transactionID !== undefined) {
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

  /**
   * Find a booking aggregate by ID.
   */
  async findById(id: number, context?: RequestContext): Promise<BookingAggregate> {
    const req = this.mapContextToReq(context)
    const doc = await this.payload.findByID({
      collection: 'bookings',
      id,
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  /**
   * Find multiple booking aggregates matching a list of IDs in a single batch query.
   */
  async findManyByIds(ids: number[], context?: RequestContext): Promise<BookingAggregate[]> {
    const req = this.mapContextToReq(context)
    if (ids.length === 0) return []
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        id: { in: ids },
      },
      limit: ids.length,
      req,
    })

    return result.docs.map((doc) => this.mapDocToAggregate(doc))
  }

  /**
   * Find a booking aggregate by human-readable booking number, with optional customerId boundary enforcement.
   */
  async findByBookingNumber(
    bookingNumber: string,
    customerId?: number,
    context?: RequestContext,
  ): Promise<BookingAggregate | null> {
    const req = this.mapContextToReq(context)
    const where: any = {
      bookingNumber: { equals: bookingNumber },
    }
    if (customerId !== undefined) {
      where.user = { equals: customerId }
    }

    const result = await this.payload.find({
      collection: 'bookings',
      where,
      limit: 1,
      req,
    })

    const doc = result.docs[0]
    return doc ? this.mapDocToAggregate(doc) : null
  }

  /**
   * Create a new booking aggregate document.
   */
  async create(data: Record<string, unknown>, context?: RequestContext): Promise<BookingAggregate> {
    const req = this.mapContextToReq(context)
    const doc = await this.payload.create({
      collection: 'bookings',
      data: data as unknown as Booking,
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  /**
   * Update an existing booking aggregate.
   */
  async update(id: number, data: Record<string, unknown>, context?: RequestContext): Promise<BookingAggregate> {
    const req = this.mapContextToReq(context)
    const doc = await this.payload.update({
      collection: 'bookings',
      id,
      data: data as unknown as Partial<Booking>,
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  /**
   * Update booking status exclusively.
   */
  async updateStatus(id: number, status: BookingStatus, context?: RequestContext): Promise<BookingAggregate> {
    const req = this.mapContextToReq(context)
    const doc = await this.payload.update({
      collection: 'bookings',
      id,
      data: {
        status: status as Booking['status'],
      },
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  /**
   * Transition booking status atomically with state machine validation and concurrency protection.
   */
  async transitionStatus(
    id: number,
    toStatus: BookingStatus,
    data: Record<string, unknown> = {},
    context?: RequestContext
  ): Promise<BookingAggregate> {
    const req = this.mapContextToReq(context)

    // 1. Fetch current status inside the active transaction context
    const current = await this.findById(id, context)

    // 2. Validate the transition against the canonical StateMachine
    validateTransition(current.status, toStatus)

    // 3. Atomically update with current status check in the query filter (optimistic concurrency guard)
    const result = await this.payload.update({
      collection: 'bookings',
      where: {
        and: [
          { id: { equals: id } },
          { status: { equals: current.status } }
        ]
      },
      data: {
        ...data,
        status: toStatus as any,
      },
      req,
    })

    const doc = result && typeof result === 'object' && 'docs' in result ? result.docs?.[0] : result
    if (!doc) {
      throw new Error(
        `[BookingRepository] Concurrency Conflict: Booking #${id} status changed concurrently from '${current.status}'`
      )
    }

    return this.mapDocToAggregate(doc)
  }

  /**
   * Update booking status conditionally (atomic state transition).
   * Returns null if no rows were updated (meaning the condition was not met).
   */
  async updateStatusConditionally(
    id: number,
    expectedStatuses: BookingStatus[],
    data: Record<string, unknown>,
    context?: RequestContext,
  ): Promise<BookingAggregate | null> {
    const req = this.mapContextToReq(context)

    // Validate target transition against the canonical StateMachine for all expected source states
    const targetStatus = data.status as BookingStatus
    if (targetStatus) {
      for (const expected of expectedStatuses) {
        validateTransition(expected, targetStatus)
      }
    }

    const result = await this.payload.update({
      collection: 'bookings',
      where: {
        and: [
          { id: { equals: id } },
          { status: { in: expectedStatuses } },
        ],
      },
      data: data as unknown as Partial<Booking>,
      req,
    })

    const doc = result && typeof result === 'object' && 'docs' in result ? result.docs?.[0] : result
    if (!doc) {
      return null
    }
    return this.mapDocToAggregate(doc)
  }

  /**
   * Retrieve customer bookings with pagination.
   */
  async findByUser(
    userId: number,
    page: number = 1,
    limit: number = 10,
    filters?: { status?: BookingStatus | BookingStatus[] },
    context?: RequestContext,
  ): Promise<PaginatedResponse<BookingAggregate>> {
    const req = this.mapContextToReq(context)
    const where: any = {
      user: { equals: userId },
    }
    if (filters?.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : { equals: filters.status }
    }

    const result = await this.payload.find({
      collection: 'bookings',
      where,
      page,
      limit,
      sort: '-createdAt',
      req,
    })

    return {
      data: result.docs.map((doc) => this.mapDocToAggregate(doc)),
      total: result.totalDocs,
      page: result.page || 1,
      limit: result.limit || 10,
      totalPages: result.totalPages || 1,
    }
  }

  /**
   * Retrieve aggregated trip summary metrics for customer overview without full document loading ($O(1) memory).
   */
  async getCustomerTripSummary(
    customerId: number,
    context?: RequestContext,
  ): Promise<CustomerTripSummary> {
    const req = this.mapContextToReq(context)

    const countDocs = async (where: any): Promise<number> => {
      if (typeof this.payload.count === 'function') {
        const res = await this.payload.count({ collection: 'bookings', where, req })
        return res.totalDocs
      }
      const res = await this.payload.find({ collection: 'bookings', where, limit: 1, req })
      return res.totalDocs
    }

    const [allCount, confirmedCount, latestResult] = await Promise.all([
      countDocs({ user: { equals: customerId } }),
      countDocs({
        user: { equals: customerId },
        status: { equals: 'confirmed' },
      }),
      this.payload.find({
        collection: 'bookings',
        where: { user: { equals: customerId } },
        limit: 1,
        sort: '-createdAt',
        req,
      }),
    ])

    const latestDoc = latestResult.docs[0]

    return {
      activeBookingsCount: allCount,
      upcomingCount: confirmedCount,
      latestBookingNumber: latestDoc?.bookingNumber,
      nextDepartureDate: latestDoc?.startDate || latestDoc?.createdAt,
    }
  }

  /**
   * Delete a booking document by ID.
   */
  async delete(id: number, context?: RequestContext): Promise<void> {
    const req = this.mapContextToReq(context)
    await this.payload.delete({
      collection: 'bookings',
      id,
      req,
    })
  }

  /**
   * Find uncompleted draft or pending payment bookings created before cutoff date.
   */
  async findExpiredDrafts(nowIso: string, context?: RequestContext): Promise<BookingAggregate[]> {
    const req = this.mapContextToReq(context)
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        and: [
          {
            or: [
              { status: { equals: 'draft' } },
              { status: { equals: 'pending_payment' } },
            ],
          },
          {
            paymentWindowExpiresAt: { less_than_equal: nowIso },
          },
        ],
      },
      limit: 100,
      req,
    })

    return result.docs.map((doc) => this.mapDocToAggregate(doc))
  }

  /**
   * Find a booking by its unique idempotency key.
   */
  async getByIdempotencyKey(idempotencyKey: string, context?: RequestContext): Promise<BookingAggregate | null> {
    const req = this.mapContextToReq(context)
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        idempotencyKey: { equals: idempotencyKey },
      },
      limit: 1,
      req,
    })

    const doc = result.docs[0]
    return doc ? this.mapDocToAggregate(doc) : null
  }

  /**
   * Map Payload document to strongly-typed BookingAggregate.
   */
  private mapDocToAggregate(doc: Booking | Record<string, unknown>): BookingAggregate {
    const docUser = (doc as Booking).user
    const customerId =
      typeof docUser === 'object' && docUser !== null ? Number(docUser.id) : Number(docUser)

    const docExp = (doc as Booking).experience
    const experienceId =
      typeof docExp === 'object' && docExp !== null
        ? Number(docExp.id)
        : Number(docExp)

    const b = doc as Booking
    const metadata =
      typeof b.metadata === 'object' && b.metadata !== null && !Array.isArray(b.metadata)
        ? (b.metadata as Record<string, unknown>)
        : {}
    const documents =
      typeof b.documents === 'object' && b.documents !== null && !Array.isArray(b.documents)
        ? (b.documents as Record<string, unknown>)
        : {}
    const idempotencyKey = typeof b.idempotencyKey === 'string' ? b.idempotencyKey : undefined
    const createdAt = typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString()
    const updatedAt = typeof b.updatedAt === 'string' ? b.updatedAt : new Date().toISOString()

    const travelers = (b.travelers || []).map((t) => ({
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
      dateOfBirth: t.dateOfBirth || undefined,
      passportNumber: t.passportNumber || undefined,
    }))

    const capacityHold =
      b.capacityHold && typeof b.capacityHold === 'object'
        ? (b.capacityHold as unknown as CapacityHoldEntity)
        : null

    const pointHold =
      b.pointHold && typeof b.pointHold === 'object'
        ? (b.pointHold as unknown as PointHoldEntity)
        : null

    const paymentAttempts = Array.isArray(b.paymentAttempts)
      ? (b.paymentAttempts as unknown as PaymentAttempt[])
      : []

    const timeline = Array.isArray(b.timeline)
      ? (b.timeline as unknown as CustomerTimelineEntry[])
      : []

    const auditTrail = Array.isArray(b.auditTrail)
      ? (b.auditTrail as unknown as SystemAuditEntry[])
      : []

    const pricingSnapshot =
      (b.pricingSnapshot as unknown as PricingSnapshotData) || ({} as PricingSnapshotData)

    const rawExpiresAt = (b as any).paymentWindowExpiresAt
    if (!rawExpiresAt || isNaN(new Date(rawExpiresAt).getTime())) {
      throw new Error(
        `[BookingRepository] Database record for booking #${doc.id} (${b.bookingNumber || 'no-number'}) is missing required paymentWindowExpiresAt (or contains an invalid timestamp: ${rawExpiresAt}).`,
      )
    }
    const paymentWindowExpiresAt =
      typeof rawExpiresAt === 'string' ? rawExpiresAt : new Date(rawExpiresAt).toISOString()

    return {
      id: Number(doc.id),
      bookingNumber: b.bookingNumber || '',
      version: b.version || 1,
      source: b.source || 'website',
      status: b.status as BookingStatus,
      customerId,
      experienceId,
      travelers,
      startDate: b.startDate ? (typeof b.startDate === 'string' ? b.startDate.split('T')[0] : new Date(b.startDate).toISOString().split('T')[0]) : '',
      endDate: b.endDate ? (typeof b.endDate === 'string' ? b.endDate.split('T')[0] : new Date(b.endDate).toISOString().split('T')[0]) : '',
      completionAt: b.completionAt ? (typeof b.completionAt === 'string' ? b.completionAt : new Date(b.completionAt).toISOString()) : '',
      destinationTimezone: b.destinationTimezone || undefined,
      paymentWindowExpiresAt,
      pricingSnapshot,
      capacityHold,
      pointHold,
      paymentStatus: (b as any).paymentStatus || 'unpaid',
      amountPaid: (b as any).amountPaid || 0,
      outstandingBalance: (b as any).outstandingBalance !== undefined ? (b as any).outstandingBalance : pricingSnapshot.totalAmountEGP,
      pointsEarned: b.pointsEarned || 0,
      paymentId: b.paymentId || undefined,
      notes: b.notes || undefined,
      paymentAttempts,
      timeline,
      auditTrail,
      documents,
      metadata,
      idempotencyKey,
      createdAt,
      updatedAt,
    }
  }
}
