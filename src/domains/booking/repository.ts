import type { Payload, PayloadRequest } from 'payload'
import type { Booking } from '@/payload-types'

/**
 * Booking Repository
 *
 * Decouples the BookingService from the Payload persistence layer.
 * All database queries for the bookings collection go through this repository.
 * If Payload is replaced in the future, only this file changes.
 */
export class BookingRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findById(id: number, req?: PayloadRequest): Promise<Booking> {
    return this.payload.findByID({
      collection: 'bookings',
      id,
      req,
    })
  }

  async create(data: any, req?: PayloadRequest): Promise<Booking> {
    return this.payload.create({
      collection: 'bookings',
      data,
      req,
    })
  }

  async update(id: number, data: any, req?: PayloadRequest): Promise<Booking> {
    return this.payload.update({
      collection: 'bookings',
      id,
      data,
      req,
    })
  }

  async findByUser(userId: number, page: number = 1, limit: number = 10, req?: PayloadRequest) {
    return this.payload.find({
      collection: 'bookings',
      where: {
        user: { equals: userId },
      },
      page,
      limit,
      sort: '-createdAt',
      req,
    })
  }

  async findByBookingNumber(bookingNumber: string, req?: PayloadRequest): Promise<Booking | null> {
    const result = await this.payload.find({
      collection: 'bookings',
      where: {
        bookingNumber: { equals: bookingNumber },
      },
      limit: 1,
      req,
    })
    return result.docs[0] || null
  }
}
