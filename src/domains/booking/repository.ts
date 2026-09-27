import type { Payload, PayloadRequest } from 'payload'
import type { BookingStatus, PaginatedResponse, RequestContext } from '@/types'
import type {
  BookingAggregate,
  BookingUserFilter,
  CustomerTripSummary,
  CapacityHoldEntity,
  PointHoldEntity,
  PaymentAttempt,
  CustomerTimelineEntry,
  SystemAuditEntry,
  PricingSnapshotData,
  CustomerCompanionTravelerProjection,
} from './types'
import type { Booking } from '@/payload-types'
import { validateTransition } from './state-machine'
import { sql } from '@payloadcms/db-postgres'

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

  /**
   * Map domain RequestContext to PayloadRequest with transaction context if available.
   */
  mapContextToReq(context?: RequestContext): PayloadRequest | undefined {
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
   * Authoritative summary of booking references for a set of departure slots.
   * Executes a native PostgreSQL COUNT + FILTER aggregation in a single query.
   * Eliminates memory bloat, document loading, and unbounded array iteration.
   */
  async getSlotBookingSummaries(
    slotIds: number[],
    context?: RequestContext,
  ): Promise<Map<number, { referencedCount: number; hasActiveBookings: boolean }>> {
    const summaryMap = new Map<number, { referencedCount: number; hasActiveBookings: boolean }>()
    if (slotIds.length === 0) return summaryMap

    // Initialize all queried slot IDs with 0 references
    for (const id of slotIds) {
      summaryMap.set(id, { referencedCount: 0, hasActiveBookings: false })
    }

    const drizzle = (this.payload.db as any)?.drizzle
    if (drizzle && typeof drizzle.execute === 'function') {
      try {
        const query = sql`
          SELECT 
            "departure_slot_id"::integer AS slot_id,
            COUNT(id)::integer AS total_count,
            COUNT(id) FILTER (WHERE "status" IN ('paid', 'confirmed', 'pending_payment', 'completed', 'pending_admin_review'))::integer AS active_count
          FROM "bookings"
          WHERE "departure_slot_id" IN ${slotIds}
          GROUP BY "departure_slot_id"
        `
        const result = await drizzle.execute(query)
        const rows = result?.rows || result || []
        for (const row of rows) {
          const slotId = Number(row.slot_id)
          const totalCount = Number(row.total_count || 0)
          const activeCount = Number(row.active_count || 0)
          summaryMap.set(slotId, {
            referencedCount: totalCount,
            hasActiveBookings: activeCount > 0,
          })
        }
        return summaryMap
      } catch (err) {
        console.warn('[BookingRepository] SQL aggregate for slots failed, using projected fallback:', err)
      }
    }

    // Pure Aggregation Fallback: Zero document loading, native database SELECT COUNT(*)
    const req = this.mapContextToReq(context)
    const activeStatuses = [
      'paid',
      'confirmed',
      'pending_payment',
      'completed',
      'pending_admin_review',
    ]

    await Promise.all(
      slotIds.map(async (slotId) => {
        const [totalCountRes, activeCountRes] = await Promise.all([
          this.payload.count({
            collection: 'bookings',
            where: {
              departureSlot: { equals: slotId },
            },
            req,
          }),
          this.payload.count({
            collection: 'bookings',
            where: {
              and: [
                { departureSlot: { equals: slotId } },
                { status: { in: activeStatuses } },
              ],
            },
            req,
          }),
        ])

        summaryMap.set(slotId, {
          referencedCount: totalCountRes.totalDocs,
          hasActiveBookings: activeCountRes.totalDocs > 0,
        })
      }),
    )

    return summaryMap
  }

  /**
   * Find paginated bookings for a single departure slot ID.
   */
  async findBookingsByDepartureSlotIdPaginated(
    slotId: number,
    page: number = 1,
    limit: number = 20,
    context?: RequestContext,
  ): Promise<PaginatedResponse<BookingAggregate>> {
    const req = this.mapContextToReq(context)
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        departureSlot: { equals: slotId },
      },
      depth: 1,
      page,
      limit,
      sort: '-createdAt',
      req,
    })

    return {
      data: result.docs.map((doc) => this.mapDocToAggregate(doc)),
      total: result.totalDocs,
      page: result.page || 1,
      limit: result.limit || limit,
      totalPages: result.totalPages || 1,
    }
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
   * Acquire exclusive row lock on the customer in PostgreSQL for write serialization.
   * Reuses the existing PostgreSQL client query pattern: SELECT id FROM customers WHERE id = $1 FOR UPDATE.
   */
  async acquireCustomerLock(customerId: number, context?: RequestContext): Promise<void> {
    const txId = context?.transactionId
    if (!txId) return

    const db = this.payload.db as unknown as { sessions?: Record<string, { db?: { session?: { client?: { query: Function } } } }> }
    const txKey = typeof txId === 'object' && txId !== null && 'then' in (txId as any) ? await txId : String(txId)
    const session = txKey ? db.sessions?.[txKey] : undefined
    const client = session?.db?.session?.client
    if (client && typeof client.query === 'function') {
      await client.query('SELECT id FROM customers WHERE id = $1 FOR UPDATE', [customerId])
    }
  }

  /**
   * Acquire exclusive row lock on the booking in PostgreSQL for write serialization.
   * Eliminates concurrent confirmation race conditions by serializing on the booking primary key.
   */
  async acquireBookingLock(bookingId: number, context?: RequestContext): Promise<void> {
    const txId = context?.transactionId
    if (!txId) return

    const db = this.payload.db as unknown as { sessions?: Record<string, { db?: { session?: { client?: { query: Function } } } }> }
    const txKey = typeof txId === 'object' && txId !== null && 'then' in (txId as any) ? await txId : String(txId)
    const session = txKey ? db.sessions?.[txKey] : undefined
    const client = session?.db?.session?.client
    if (client && typeof client.query === 'function') {
      await client.query('SELECT id FROM bookings WHERE id = $1 FOR UPDATE', [bookingId])
    }
  }

  /**
   * Authoritative summary of active loyalty points held in uncommitted bookings for a customer.
   * Scoped strictly to bookings with active reservation statuses ('draft', 'pending_payment', 'pending_admin_review')
   * where pointHold.status === 'held'.
   * 
   * Performance & Correctness Optimization (Gate 17.5.38):
   * Performs database-side SQL COUNT + SUM aggregation in PostgreSQL.
   * Eliminates artificial document limits (limit: 1000), memory bloat, and in-memory JavaScript loops.
   */
  async getActiveHeldPointsSummaryForCustomer(
    customerId: number,
    context?: RequestContext,
  ): Promise<{ totalPoints: number; count: number }> {
    const drizzle = (this.payload.db as any)?.drizzle
    if (drizzle && typeof drizzle.execute === 'function') {
      try {
        const query = sql`
          SELECT 
            COALESCE(SUM((point_hold->>'pointsHeld')::integer), 0) AS total_points,
            COUNT(id)::integer AS count
          FROM "bookings"
          WHERE "user_id" = ${customerId}
            AND "status" IN ('draft', 'pending_payment', 'pending_admin_review')
            AND (point_hold->>'status') = 'held'
            AND ((point_hold->>'pointsHeld')::integer) > 0
            AND (
              "status" = 'pending_admin_review'
              OR (point_hold->>'expiresAt') IS NULL
              OR (point_hold->>'expiresAt')::timestamptz > NOW()
            )
        `
        const result = await drizzle.execute(query)
        const row = result?.rows?.[0] || result?.[0]
        if (row) {
          return {
            totalPoints: Number(row.total_points || 0),
            count: Number(row.count || 0),
          }
        }
        return { totalPoints: 0, count: 0 }
      } catch (dbErr) {
        console.warn(
          `[BookingRepository] Database-level hold aggregation failed for customer #${customerId}, using fallback:`,
          dbErr instanceof Error ? dbErr.message : String(dbErr),
        )
      }
    }

    // Safe fallback for non-Postgres / unit testing environments
    const req = this.mapContextToReq(context)
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        and: [
          { user: { equals: customerId } },
          {
            status: {
              in: [
                'draft',
                'pending_payment',
                'pending_admin_review',
              ],
            },
          },
        ],
      },
      pagination: false,
      limit: 0, // No artificial limit in fallback
      req,
    })

    let totalHeld = 0
    let count = 0
    for (const doc of result.docs) {
      const hold = doc.pointHold as PointHoldEntity | null | undefined
      if (hold && hold.status === 'held' && typeof hold.pointsHeld === 'number' && hold.pointsHeld > 0) {
        if (doc.status !== 'pending_admin_review' && hold.expiresAt && new Date(hold.expiresAt).getTime() <= Date.now()) {
          continue
        }
        totalHeld += hold.pointsHeld
        count++
      }
    }

    return { totalPoints: totalHeld, count }
  }

  /**
   * Calculate total active loyalty points held in uncommitted bookings for a customer.
   */
  async getActiveHeldPointsForCustomer(customerId: number, context?: RequestContext): Promise<number> {
    const summary = await this.getActiveHeldPointsSummaryForCustomer(customerId, context)
    return summary.totalPoints
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
    filters?: BookingUserFilter,
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
    if (filters?.statusNotIn && filters.statusNotIn.length > 0) {
      where.status = { not_in: filters.statusNotIn }
    }
    if (filters?.paymentStatus) {
      where.paymentStatus = Array.isArray(filters.paymentStatus)
        ? { in: filters.paymentStatus }
        : { equals: filters.paymentStatus }
    }
    if (filters?.paymentStatusNotIn && filters.paymentStatusNotIn.length > 0) {
      where.paymentStatus = { not_in: filters.paymentStatusNotIn }
    }
    if (filters?.or && filters.or.length > 0) {
      where.or = filters.or
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
   * Read-only server-side paginated projection for companion travelers from authoritative booking manifests.
   * Paginates and counts directly at the companion traveler level (bookings_travelers where _order > 1).
   * Guaranteed O(limit) memory footprint with deterministic ordering and zero dataset truncation.
   * Fail-fast: Throws explicit error on DB failure (No Fallback).
   */
  async findCompanionTravelersByCustomerId(
    customerId: number,
    options?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<CustomerCompanionTravelerProjection>> {
    const page = Math.max(1, options?.page || 1)
    const limit = Math.max(1, options?.limit || 20)
    const offset = (page - 1) * limit

    const drizzle = (this.payload.db as any)?.drizzle
    if (!drizzle || typeof drizzle.execute !== 'function') {
      throw new Error('[BookingRepository] PostgreSQL Drizzle client is required for authoritative companion traveler queries.')
    }

    const [countResult, rowsResult] = await Promise.all([
      drizzle.execute(sql`
        SELECT COUNT(bt.id)::integer AS total_count
        FROM "bookings_travelers" bt
        JOIN "bookings" b ON b.id = bt._parent_id
        WHERE b.user_id = ${customerId} AND bt._order > 1;
      `),
      drizzle.execute(sql`
        SELECT 
          bt.id AS traveler_id,
          bt._parent_id AS booking_id,
          b.booking_number,
          bt.first_name,
          bt.last_name,
          bt.date_of_birth,
          bt.passport_number
        FROM "bookings_travelers" bt
        JOIN "bookings" b ON b.id = bt._parent_id
        WHERE b.user_id = ${customerId} AND bt._order > 1
        ORDER BY b.created_at DESC, b.id DESC, bt._order ASC, bt.id ASC
        LIMIT ${limit} OFFSET ${offset};
      `),
    ])

    const countRow = countResult?.rows?.[0] || countResult?.[0]
    const total = Number(countRow?.total_count || 0)
    const rows = rowsResult?.rows || rowsResult || []

    const data: CustomerCompanionTravelerProjection[] = rows.map((r: any) => {
      if (!r.booking_number) {
        throw new Error(`[BookingRepository] Invariant Violation: Booking #${r.booking_id} is missing required bookingNumber.`)
      }
      return {
        id: `tr_${r.traveler_id}`,
        bookingId: Number(r.booking_id),
        bookingNumber: String(r.booking_number),
        firstName: String(r.first_name).trim(),
        lastName: String(r.last_name).trim(),
        dateOfBirth: r.date_of_birth ? new Date(r.date_of_birth).toISOString() : undefined,
        passportNumber: r.passport_number || undefined,
      }
    })

    return {
      data,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
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
      email: t.email || undefined,
      phone: t.phone || undefined,
      dateOfBirth: t.dateOfBirth || undefined,
      passportNumber: t.passportNumber || undefined,
      nationality: (t as any).nationality || undefined,
      type: ((t as any).type as 'adult' | 'child' | 'infant') || 'adult',
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

    const docSlot = (b as any).departureSlot
    const departureSlot =
      typeof docSlot === 'object' && docSlot !== null
        ? Number(docSlot.id)
        : typeof docSlot === 'number'
        ? docSlot
        : undefined

    const pickupLoc = (b as any).pickupLocation
    const pickupLocation =
      pickupLoc && typeof pickupLoc === 'object' && pickupLoc.label && pickupLoc.address
        ? {
            label: String(pickupLoc.label),
            address: String(pickupLoc.address),
            latitude: Number(pickupLoc.latitude || 0),
            longitude: Number(pickupLoc.longitude || 0),
            source: pickupLoc.source || undefined,
            instructions: pickupLoc.instructions || undefined,
          }
        : null

    return {
      id: Number(doc.id),
      bookingNumber: b.bookingNumber || '',
      version: b.version || 1,
      source: b.source || 'website',
      status: b.status as BookingStatus,
      customerId,
      experienceId,
      departureSlot,
      travelers,
      startDate: b.startDate ? (typeof b.startDate === 'string' ? b.startDate.split('T')[0] : new Date(b.startDate).toISOString().split('T')[0]) : '',
      endDate: b.endDate ? (typeof b.endDate === 'string' ? b.endDate.split('T')[0] : new Date(b.endDate).toISOString().split('T')[0]) : '',
      completionAt: b.completionAt ? (typeof b.completionAt === 'string' ? b.completionAt : new Date(b.completionAt).toISOString()) : '',
      destinationTimezone: b.destinationTimezone || undefined,
      paymentWindowExpiresAt,
      pickupLocation,
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

  /**
   * Attach a canonical traveler ID to a specific manifest row of a booking.
   * Strictly booking-owned persistence boundary.
   * Transaction-mandatory operation: must execute on the active PostgreSQL transaction connection.
   * Strictly prevents any fallback to pool or standalone drizzle to eliminate distributed deadlocks.
   */
  async updateManifestTravelerId(
    bookingId: number,
    order: number,
    travelerId: number,
    context?: RequestContext,
  ): Promise<void> {
    const dbAdapter = this.payload.db as any
    const req = this.mapContextToReq(context)
    const transactionID = req?.transactionID
    const txKey = transactionID instanceof Promise ? await transactionID : transactionID

    if (!txKey || !dbAdapter?.sessions?.[txKey]?.db?.session?.client) {
      throw new Error(
        `[BookingRepository.updateManifestTravelerId] Transaction-mandatory operation failed: No active transaction client found for txKey "${txKey}". Fallback to pool is strictly forbidden to prevent distributed deadlocks.`
      )
    }

    const client = dbAdapter.sessions[txKey].db.session.client
    const sqlText = `
      UPDATE "bookings_travelers"
      SET "traveler_id" = $1
      WHERE "_parent_id" = $2 AND "_order" = $3;
    `
    await client.query(sqlText, [travelerId, bookingId, order])
  }
}

