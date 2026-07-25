import type { Payload, PayloadRequest } from 'payload'
import type { ExperienceAggregate } from './aggregate'
import type { DepartureSlotEntity, ExperienceAvailabilityStatus, ExperienceType } from './types'
import { validateAvailabilityTransition } from './state-machine'
import { PricingPolicyRegistry } from './pricing-policy-registry'

/**
 * Experience Repository
 * Sole data persistence layer for the Experience Domain.
 * Intercepts all database queries for 'experiences', 'cities', and 'countries' collections.
 */
export class ExperienceRepository {
  private payload: Payload

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
   * Find departure slots for a specific experience ID from database.
   */
  async findSlotsByExperienceId(experienceId: number, req?: PayloadRequest): Promise<DepartureSlotEntity[]> {
    const result = await this.payload.find({
      collection: 'departure-slots',
      where: {
        experience: { equals: experienceId },
      },
      limit: 100,
      req,
    })

    return result.docs.map((doc: any) => {
      const expId = doc.experience ? (typeof doc.experience === 'object' ? Number(doc.experience.id) : Number(doc.experience)) : experienceId
      if (!doc.date || doc.capacityTotal === undefined) {
        throw new Error(`[ExperienceRepository] Database record for slot ${doc.id} is invalid or missing required fields.`)
      }
      return {
        id: Number(doc.id),
        departureId: doc.departureId,
        experienceId: expId,
        date: new Date(doc.date).toISOString().split('T')[0],
        startTime: doc.startTime || '',
        basePriceEGP: doc.basePriceEGP ?? undefined,
        capacityTotal: doc.capacityTotal,
        capacityReserved: doc.capacityReserved ?? 0,
        capacitySold: doc.capacitySold ?? 0,
        capacityAvailable: doc.capacityAvailable,
        version: doc.version,
        status: doc.status,
      }
    })
  }

  /**
   * Fetch departure slot entity by slot ID (number) and optional experience ID.
   */
  async getDepartureSlotById(slotId: number, experienceId?: number): Promise<DepartureSlotEntity | null> {
    try {
      const doc = await this.payload.findByID({
        collection: 'departure-slots',
        id: slotId,
      })

      if (!doc) return null

      const expId = doc.experience ? (typeof doc.experience === 'object' ? Number(doc.experience.id) : Number(doc.experience)) : 0
      if (!expId || !doc.date || doc.capacityTotal === undefined) {
        throw new Error(`[ExperienceRepository] Database slot record ${slotId} is invalid.`)
      }

      return {
        id: Number(doc.id),
        departureId: doc.departureId,
        experienceId: expId,
        date: new Date(doc.date).toISOString().split('T')[0],
        startTime: doc.startTime || '',
        basePriceEGP: doc.basePriceEGP ?? undefined,
        capacityTotal: doc.capacityTotal,
        capacityReserved: doc.capacityReserved ?? 0,
        capacitySold: doc.capacitySold ?? 0,
        capacityAvailable: doc.capacityAvailable,
        version: doc.version,
        status: doc.status,
      }
    } catch {
      return null
    }
  }

  /**
   * Fetch departure slot entity by departure ID.
   */
  async getDepartureSlot(departureId: string): Promise<DepartureSlotEntity | null> {
    try {
      const result = await this.payload.find({
        collection: 'departure-slots',
        where: {
          departureId: { equals: departureId },
        },
        limit: 1,
      })

      const doc = result.docs[0]
      if (!doc) return null

      const expId = doc.experience ? (typeof doc.experience === 'object' ? Number(doc.experience.id) : Number(doc.experience)) : 0
      if (!expId || !doc.date || doc.capacityTotal === undefined) {
        throw new Error(`[ExperienceRepository] Database slot record ${departureId} is invalid.`)
      }

      return {
        id: Number(doc.id),
        departureId: doc.departureId,
        experienceId: expId,
        date: new Date(doc.date).toISOString().split('T')[0],
        startTime: doc.startTime || '',
        basePriceEGP: doc.basePriceEGP ?? undefined,
        capacityTotal: doc.capacityTotal,
        capacityReserved: doc.capacityReserved ?? 0,
        capacitySold: doc.capacitySold ?? 0,
        capacityAvailable: doc.capacityAvailable,
        version: doc.version,
        status: doc.status,
      }
    } catch {
      return null
    }
  }

  /**
   * Fetch departure slot entity by date and experience ID.
   */
  async getDepartureSlotByDate(experienceId: number, date: string): Promise<DepartureSlotEntity | null> {
    try {
      const result = await this.payload.find({
        collection: 'departure-slots',
        where: {
          and: [
            { experience: { equals: experienceId } },
            { date: { equals: date } },
          ],
        },
        limit: 1,
      })

      const doc = result.docs[0]
      if (!doc) return null

      return {
        id: Number(doc.id),
        departureId: doc.departureId,
        experienceId: experienceId,
        date: new Date(doc.date).toISOString().split('T')[0],
        startTime: doc.startTime || '',
        basePriceEGP: doc.basePriceEGP ?? undefined,
        capacityTotal: doc.capacityTotal,
        capacityReserved: doc.capacityReserved ?? 0,
        capacitySold: doc.capacitySold ?? 0,
        capacityAvailable: doc.capacityAvailable,
        version: doc.version,
        status: doc.status,
      }
    } catch {
      return null
    }
  }


  /**
   * Save / update departure slot entity with Optimistic Locking version check.
   */
  async saveDepartureSlot(slot: DepartureSlotEntity): Promise<DepartureSlotEntity> {
    try {
      const result = await this.payload.find({
        collection: 'departure-slots',
        where: {
          departureId: { equals: slot.departureId },
        },
        limit: 1,
      })

      const existing = result.docs[0]
      if (existing && existing.version !== slot.version) {
        throw new Error(
          `[ExperienceRepository] Optimistic Lock Failure on DepartureSlot ${slot.departureId}. Expected version ${slot.version}, found ${existing.version}.`,
        )
      }

      const nextVersion = slot.version + 1
      const capacityAvailable = Math.max(0, slot.capacityTotal - slot.capacityReserved - slot.capacitySold)

      if (existing) {
        await this.payload.update({
          collection: 'departure-slots',
          id: existing.id,
          data: {
            capacityReserved: slot.capacityReserved,
            capacitySold: slot.capacitySold,
            capacityAvailable,
            version: nextVersion,
            status: slot.status as any,
          },
        })
        return {
          ...slot,
          version: nextVersion,
          capacityAvailable,
        }
      } else {
        await this.payload.create({
          collection: 'departure-slots',
          data: {
            departureId: slot.departureId,
            experience: slot.experienceId,
            date: slot.date,
            startTime: slot.startTime,
            basePriceEGP: slot.basePriceEGP,
            capacityTotal: slot.capacityTotal,
            capacityReserved: slot.capacityReserved,
            capacitySold: slot.capacitySold,
            capacityAvailable,
            version: nextVersion,
            status: slot.status as any,
          },
        })
        return {
          ...slot,
          version: nextVersion,
          capacityAvailable,
        }
      }
    } catch (err) {
      throw err
    }
  }

  private mapDocToAggregate(doc: any): ExperienceAggregate {
    const cityId = doc.city ? (typeof doc.city === 'object' ? Number(doc.city.id) : Number(doc.city)) : 0

    if (!doc.title || !doc.slug || !doc.type || !cityId || !doc.availability) {
      throw new Error(`[ExperienceRepository] Database record for experience ${doc.id} is invalid or missing required fields.`)
    }

    // Recover PricingSource dynamically using PricingPolicyRegistry
    const pricingSource = PricingPolicyRegistry.getSource(doc.type as ExperienceType)
    if (pricingSource === 'catalog' && (doc.price === undefined || doc.price === null)) {
      throw new Error(`[ExperienceRepository] Catalog-priced experience ${doc.id} is missing mandatory price in DB.`)
    }

    return {
      id: Number(doc.id),
      title: doc.title,
      slug: doc.slug,
      type: doc.type,
      cityId,
      basePriceEGP: doc.price !== null && doc.price !== undefined ? Number(doc.price) : undefined,
      availability: doc.availability as ExperienceAvailabilityStatus,
      durationDays: doc.durationDays || 1,
      durationNights: doc.durationNights || 0,
      version: 1,
      isActive: doc.isActive ?? true,
      heroUrl: doc.hero && typeof doc.hero === 'object' ? doc.hero.url || '' : '',
      createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString()),
      updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : (doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString()),
    }
  }
}
