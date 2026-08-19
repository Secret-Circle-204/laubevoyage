import type { Payload, PayloadRequest } from 'payload'
import type { RequestContext } from '@/types'
import type { ExperienceAggregate } from './aggregate'
import type { DepartureSlotEntity, ExperienceAvailabilityStatus, ExperienceType, ExperienceSearchQueryParams } from './types'
import { validateAvailabilityTransition } from './state-machine'
import { PricingPolicyRegistry } from './pricing-policy-registry'
import { serializeLexicalToHtml } from '@/lib/lexical'

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
   * Find multiple experience aggregates matching a list of experience IDs in a single query.
   */
  async findManyByIds(experienceIds: number[], req?: PayloadRequest): Promise<ExperienceAggregate[]> {
    if (experienceIds.length === 0) return []
    const result = await this.payload.find({
      collection: 'experiences',
      where: {
        id: { in: experienceIds },
      },
      limit: experienceIds.length,
      req,
    })

    return result.docs.map((doc: any) => this.mapDocToAggregate(doc))
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
   * Find experiences using filters.
   */
  async findFiltered(params: ExperienceSearchQueryParams, req?: PayloadRequest): Promise<ExperienceAggregate[]> {
    const where: any = { and: [] }

    if (params.type) {
      where.and.push({ type: { equals: params.type } })
    }
    if (params.cityId) {
      where.and.push({ city: { equals: params.cityId } })
    }
    if (params.availability) {
      where.and.push({ availability: { equals: params.availability } })
    }
    if (params.minPriceEGP !== undefined) {
      where.and.push({ price: { greater_than_or_equal: params.minPriceEGP } })
    }
    if (params.maxPriceEGP !== undefined) {
      where.and.push({ price: { less_than_or_equal: params.maxPriceEGP } })
    }

    if (where.and.length === 0) {
      delete where.and
    }

    const result = await this.payload.find({
      collection: 'experiences',
      where,
      limit: 100,
      req,
    })

    return result.docs.map((doc: any) => this.mapDocToAggregate(doc))
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

  private mapContextToReq(context?: RequestContext): PayloadRequest | undefined {
    if (!context || context.transactionId === null || context.transactionId === undefined) {
      return undefined
    }
    return {
      transactionID: context.transactionId,
    } as unknown as PayloadRequest
  }

  /**
   * Fetch departure slot entity by departure ID.
   */
  async getDepartureSlot(departureId: string, context?: RequestContext): Promise<DepartureSlotEntity | null> {
    const req = this.mapContextToReq(context)
    try {
      const result = await this.payload.find({
        collection: 'departure-slots',
        where: {
          departureId: { equals: departureId },
        },
        limit: 1,
        req,
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
  async getDepartureSlotByDate(experienceId: number, date: string, context?: RequestContext): Promise<DepartureSlotEntity | null> {
    const req = this.mapContextToReq(context)
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
        req,
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
  async saveDepartureSlot(slot: DepartureSlotEntity, context?: RequestContext): Promise<DepartureSlotEntity> {
    const req = this.mapContextToReq(context)
    try {
      const result = await this.payload.find({
        collection: 'departure-slots',
        where: {
          departureId: { equals: slot.departureId },
        },
        limit: 1,
        req,
      })

      const existing = result.docs[0]
      const nextVersion = slot.version + 1
      const capacityAvailable = Math.max(0, slot.capacityTotal - slot.capacityReserved - slot.capacitySold)

      if (existing) {
        // Atomic SQL update to ensure safety against race conditions
        const dbAdapter = this.payload.db as any
        const transactionID = req?.transactionID

        const sqlText = `
          UPDATE departure_slots
          SET capacity_reserved = $1,
              capacity_sold = $2,
              capacity_available = $3,
              version = $4,
              status = $5
          WHERE departure_id = $6
            AND version = $7
            AND (capacity_total - $1 - $2) >= 0;
        `
        const params = [
          slot.capacityReserved,
          slot.capacitySold,
          capacityAvailable,
          nextVersion,
          slot.status,
          slot.departureId,
          slot.version
        ]

        const txKey = transactionID instanceof Promise ? await transactionID : transactionID

        let queryResult: { rowCount: number } = { rowCount: 1 }
        if (dbAdapter) {
          if (txKey && dbAdapter.sessions?.[txKey]?.db?.session?.client) {
            const client = dbAdapter.sessions[txKey].db.session.client
            queryResult = await client.query(sqlText, params)
          } else if (dbAdapter.pool && typeof dbAdapter.pool.query === 'function') {
            queryResult = await dbAdapter.pool.query(sqlText, params)
          } else if (dbAdapter.drizzle && typeof dbAdapter.drizzle.execute === 'function') {
            const res = await dbAdapter.drizzle.execute(sqlText, params)
            queryResult = { rowCount: res.rowCount ?? 0 }
          } else {
            throw new Error('[ExperienceRepository] No raw SQL database execution adapter is configured.')
          }
        }

        if (queryResult.rowCount === 0) {
          throw new Error(
            `[ExperienceRepository] Atomic Optimistic Lock Failure on DepartureSlot ${slot.departureId}. Either the version (${slot.version}) has changed or capacity is exhausted.`
          )
        }

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
          req,
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
      console.warn(`[ExperienceRepository] Catalog-priced experience ${doc.id} is missing price in DB. Defaulting basePriceEGP to 0.`)
    }

    const gallery = Array.isArray(doc.gallery)
      ? doc.gallery
          .map((img: any) => {
            const media = img.image
            if (media && typeof media === 'object') {
              return media.url || ''
            }
            if (typeof media === 'string') {
              return media
            }
            return ''
          })
          .filter(Boolean)
      : []

    const included = Array.isArray(doc.included) ? doc.included.map((x: any) => x.item || '').filter(Boolean) : []
    const excluded = Array.isArray(doc.excluded) ? doc.excluded.map((x: any) => x.item || '').filter(Boolean) : []

    const itinerary = Array.isArray(doc.itinerary)
      ? doc.itinerary.map((x: any) => ({
          dayNumber: Number(x.dayNumber) || 1,
          title: x.title || '',
          description: x.description || '',
        }))
      : []

    const descriptionHtml = doc.description ? serializeLexicalToHtml(doc.description) : ''

    return {
      id: Number(doc.id),
      title: doc.title,
      slug: doc.slug,
      type: doc.type,
      cityId,
      basePriceEGP: doc.price !== null && doc.price !== undefined ? Number(doc.price) : 0,
      availability: doc.availability as ExperienceAvailabilityStatus,
      durationDays: doc.durationDays || 1,
      durationNights: doc.durationNights || 0,
      version: 1,
      isActive: doc.isActive ?? true,
      heroUrl: doc.hero && typeof doc.hero === 'object' ? doc.hero.url || '' : '',
      createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString()),
      updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : (doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString()),
      gallery,
      included,
      excluded,
      descriptionHtml,
      itinerary,
    }
  }
}
