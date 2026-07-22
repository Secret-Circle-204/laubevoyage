import type { Payload, PayloadRequest } from 'payload'
import type { ExperienceAggregate } from './aggregate'
import type { DepartureSlotEntity, ExperienceAvailabilityStatus } from './types'
import { validateAvailabilityTransition } from './state-machine'

/**
 * Experience Repository
 * Sole data persistence layer for the Experience Domain.
 * Intercepts all database queries for 'experiences', 'cities', and 'countries' collections.
 */
export class ExperienceRepository {
  private payload: Payload
  private departureSlotMap: Map<string, DepartureSlotEntity> = new Map()

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Find experience aggregate by ID.
   */
  async findById(experienceId: number, req?: PayloadRequest): Promise<ExperienceAggregate> {
    const doc = await this.payload.findByID({
      collection: 'experiences',
      id: experienceId,
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  /**
   * Find experience aggregate by unique slug.
   */
  async findBySlug(slug: string, req?: PayloadRequest): Promise<ExperienceAggregate | null> {
    const result = await this.payload.find({
      collection: 'experiences',
      where: {
        slug: { equals: slug },
      },
      limit: 1,
      req,
    })

    return result.docs[0] ? this.mapDocToAggregate(result.docs[0]) : null
  }

  /**
   * Update experience availability status exclusively with State Machine validation.
   */
  async updateAvailability(
    experienceId: number,
    newStatus: ExperienceAvailabilityStatus,
    req?: PayloadRequest,
  ): Promise<ExperienceAggregate> {
    const current = await this.findById(experienceId, req)

    validateAvailabilityTransition(current.availability, newStatus)

    const doc = await this.payload.update({
      collection: 'experiences',
      id: experienceId,
      data: {
        availability: newStatus as any,
      },
      req,
    })

    return this.mapDocToAggregate(doc)
  }

  /**
   * Fetch departure slot entity by departure ID.
   */
  async getDepartureSlot(departureId: string): Promise<DepartureSlotEntity | null> {
    const slot = this.departureSlotMap.get(departureId)
    if (slot) return slot

    // Fallback in-memory departure slot initialization
    const mockSlot: DepartureSlotEntity = {
      departureId,
      experienceId: 1,
      date: '2026-08-01',
      startTime: '09:00',
      basePriceEGP: 2000,
      capacityTotal: 20,
      capacityReserved: 0,
      capacitySold: 0,
      capacityAvailable: 20,
      version: 1,
      isBlackedOut: false,
      status: 'available',
    }

    this.departureSlotMap.set(departureId, mockSlot)
    return mockSlot
  }

  /**
   * Save / update departure slot entity with Optimistic Locking version check.
   */
  async saveDepartureSlot(slot: DepartureSlotEntity): Promise<DepartureSlotEntity> {
    const existing = this.departureSlotMap.get(slot.departureId)
    if (existing && existing.version !== slot.version) {
      throw new Error(
        `[ExperienceRepository] Optimistic Lock Failure on DepartureSlot ${slot.departureId}. Expected version ${slot.version}, found ${existing.version}.`,
      )
    }

    const updatedSlot = {
      ...slot,
      version: slot.version + 1,
      capacityAvailable: Math.max(0, slot.capacityTotal - slot.capacityReserved - slot.capacitySold),
    }

    this.departureSlotMap.set(slot.departureId, updatedSlot)
    return updatedSlot
  }

  /**
   * Map Payload document to strongly-typed ExperienceAggregate.
   */
  private mapDocToAggregate(doc: any): ExperienceAggregate {
    return {
      id: Number(doc.id),
      title: doc.title || '',
      slug: doc.slug || '',
      type: doc.type || 'daily_tour',
      cityId: doc.city ? (typeof doc.city === 'object' ? Number(doc.city.id) : Number(doc.city)) : 0,
      basePriceEGP: doc.price || 0,
      availability: doc.availability as ExperienceAvailabilityStatus,
      capacityTotal: 20,
      durationDays: doc.duration?.days || 1,
      durationNights: doc.duration?.nights || 0,
      version: 1,
      isActive: doc.isActive ?? true,
      createdAt: doc.createdAt ? (typeof doc.createdAt === 'string' ? doc.createdAt : new Date(doc.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: doc.updatedAt ? (typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date(doc.updatedAt).toISOString()) : new Date().toISOString(),
    }
  }
}
