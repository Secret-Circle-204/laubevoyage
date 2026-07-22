import type { Payload, PayloadRequest } from 'payload'
import type { BookingStatus, PaginatedResponse } from '@/types'
import type { BookingAggregate } from './types'

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
      data: data as any,
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
      data: data as any,
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
        status: status as any,
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
   * Find uncompleted draft or pending payment bookings created before cutoff date.
   */
  async findExpiredDrafts(cutoffIso: string, req?: PayloadRequest): Promise<BookingAggregate[]> {
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        or: [
          { status: { equals: 'draft' } },
          { status: { equals: 'pending_payment' } },
        ],
        createdAt: { less_than: cutoffIso },
      },
      limit: 100,
      req,
    })

    return result.docs.map((doc) => this.mapDocToAggregate(doc))
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
      createdAt: doc.createdAt ? (typeof doc.createdAt === 'string' ? doc.createdAt : new Date(doc.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: doc.updatedAt ? (typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date(doc.updatedAt).toISOString()) : new Date().toISOString(),
    }
  }
}
