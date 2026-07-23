import type { Payload, PayloadRequest } from 'payload'
import type { CompanionTravelerEntity } from '../types'

/**
 * Traveler Repository
 * Sole data persistence layer for the 'customer-travelers' Payload collection.
 */
export class TravelerRepository {
  private payload?: Payload

  constructor(payload?: Payload) {
    this.payload = payload
  }

  async findByCustomerId(customerId: number, req?: PayloadRequest): Promise<CompanionTravelerEntity[]> {
    if (!this.payload) return []
    const result = await this.payload.find({
      collection: 'customer-travelers',
      where: {
        customer: { equals: customerId },
      },
      limit: 100,
      req,
    })

    return result.docs.map((doc: any) => ({
      travelerId: String(doc.id),
      customerId: typeof doc.customer === 'object' ? Number(doc.customer.id) : Number(doc.customer),
      firstName: doc.firstName,
      lastName: doc.lastName,
      dateOfBirth: doc.dateOfBirth ? new Date(doc.dateOfBirth).toISOString() : undefined,
      passportNumber: doc.passportNumber || undefined,
      relationship: doc.relationship || 'other',
    }))
  }

  async addTraveler(traveler: Omit<CompanionTravelerEntity, 'travelerId'>, req?: PayloadRequest): Promise<CompanionTravelerEntity> {
    if (!this.payload) throw new Error('[TravelerRepository] Payload instance not initialized.')
    const doc = await this.payload.create({
      collection: 'customer-travelers',
      data: {
        customer: traveler.customerId,
        firstName: traveler.firstName,
        lastName: traveler.lastName,
        dateOfBirth: traveler.dateOfBirth,
        passportNumber: traveler.passportNumber,
        relationship: traveler.relationship,
      },
      req,
    })

    return {
      travelerId: String(doc.id),
      customerId: traveler.customerId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      dateOfBirth: doc.dateOfBirth ? new Date(doc.dateOfBirth).toISOString() : undefined,
      passportNumber: doc.passportNumber || undefined,
      relationship: doc.relationship || 'other',
    }
  }
}
