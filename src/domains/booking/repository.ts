import type { Payload, PayloadRequest } from 'payload'
import type { BookingStatus, PaginatedResponse, RequestContext } from '@/types'
import type { BookingAggregate, CustomerTripSummary } from './types'
import type { Booking } from '@/payload-types'

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
    filters?: { status?: BookingStatus },
    context?: RequestContext,
  ): Promise<PaginatedResponse<BookingAggregate>> {
    const req = this.mapContextToReq(context)
    const where: any = {
      user: { equals: userId },
    }
    if (filters?.status) {
      where.status = { equals: filters.status }
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
        or: [
          { status: { equals: 'draft' } },
          { status: { equals: 'pending_payment' } },
        ],
      },
      limit: 100,
      req,
    })

    const now = new Date(nowIso)
    const expiredDocs = result.docs.filter((doc) => {
      const hold = doc.capacityHold as any
      if (hold) {
        if (hold.status === 'active') {
          if (!hold.expiresAt) return true
          return new Date(hold.expiresAt) <= now
        }
        return false
      }
      return true
    })

    return expiredDocs.map((doc) => this.mapDocToAggregate(doc))
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
  private mapDocToAggregate(doc: any): BookingAggregate {
    const customerId =
      typeof doc.user === 'object' && doc.user !== null ? Number(doc.user.id) : Number(doc.user)
    const experienceId =
      typeof doc.experience === 'object' && doc.experience !== null
        ? Number(doc.experience.id)
        : Number(doc.experience)

    return {
      id: Number(doc.id),
      bookingNumber: doc.bookingNumber || '',
      version: doc.version || 1,
      source: doc.source || 'website',
      status: doc.status as BookingStatus,
      customerId,
      experienceId,
      travelers: doc.travelers || [],
      startDate: doc.startDate ? (typeof doc.startDate === 'string' ? doc.startDate.split('T')[0] : new Date(doc.startDate).toISOString().split('T')[0]) : '',
      endDate: doc.endDate ? (typeof doc.endDate === 'string' ? doc.endDate.split('T')[0] : new Date(doc.endDate).toISOString().split('T')[0]) : '',
      pricingSnapshot: doc.pricingSnapshot || {},
      capacityHold: doc.capacityHold || null,
      pointHold: doc.pointHold || null,
      pointsEarned: doc.pointsEarned || 0,
      paymentId: doc.paymentId,
      notes: doc.notes,
      paymentAttempts: doc.paymentAttempts || [],
      timeline: doc.timeline || [],
      auditTrail: doc.auditTrail || [],
      documents: doc.documents || {},
      metadata: doc.metadata || {},
      idempotencyKey: doc.idempotencyKey || undefined,
      createdAt: doc.createdAt ? (typeof doc.createdAt === 'string' ? doc.createdAt : new Date(doc.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: doc.updatedAt ? (typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date(doc.updatedAt).toISOString()) : new Date().toISOString(),
    }
  }
}
