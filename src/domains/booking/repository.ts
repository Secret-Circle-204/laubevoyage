import type { Payload, PayloadRequest } from 'payload'
import type { BookingStatus, PaginatedResponse } from '@/types'
import type { BookingAggregate } from './types'
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
   * Find a booking aggregate by ID.
   */
  async findById(id: number, req?: PayloadRequest): Promise<BookingAggregate> {
    const doc = await this.payload.findByID({
      collection: 'bookings',
      id,
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  /**
   * Find a booking aggregate by human-readable booking number.
   */
  async findByBookingNumber(bookingNumber: string, req?: PayloadRequest): Promise<BookingAggregate | null> {
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        bookingNumber: { equals: bookingNumber },
      },
      limit: 1,
      req,
    })

    const doc = result.docs[0]
    return doc ? this.mapDocToAggregate(doc) : null
  }

  /**
   * Create a new booking aggregate document.
   */
  async create(data: Record<string, unknown>, req?: PayloadRequest): Promise<BookingAggregate> {
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
  async update(id: number, data: Record<string, unknown>, req?: PayloadRequest): Promise<BookingAggregate> {
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
  async updateStatus(id: number, status: BookingStatus, req?: PayloadRequest): Promise<BookingAggregate> {
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
   * Retrieve customer bookings with pagination.
   */
  async findByUser(
    userId: number,
    page: number = 1,
    limit: number = 10,
    req?: PayloadRequest,
  ): Promise<PaginatedResponse<BookingAggregate>> {
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        user: { equals: userId },
      },
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
   * Delete a booking document by ID.
   */
  async delete(id: number, req?: PayloadRequest): Promise<void> {
    await this.payload.delete({
      collection: 'bookings',
      id,
      req,
    })
  }

  /**
   * Find uncompleted draft or pending payment bookings created before cutoff date.
   */
  async findExpiredDrafts(nowIso: string, req?: PayloadRequest): Promise<BookingAggregate[]> {
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
  async getByIdempotencyKey(idempotencyKey: string, req?: PayloadRequest): Promise<BookingAggregate | null> {
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
      startDate: doc.startDate || '',
      endDate: doc.endDate || '',
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
