import type { Payload, PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type {
  CanonicalTravelerEntity,
  CompanionTravelerEntity,
  TravelerReportRecord,
} from '../types'
import type { TravelerInput } from '@/domains/booking/types'
import type { PaginatedResponse } from '@/types'

/**
 * Traveler Repository
 * Authoritative persistence layer for:
 * 1. Canonical Travelers ('travelers' collection)
 * 2. Customer ↔ Traveler Relationships ('customer-travelers' collection)
 * 3. Bounded Reporting & DB-level aggregations
 */
export class TravelerRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Find a canonical traveler by primary key ID.
   */
  async findTravelerById(
    id: number,
    req?: PayloadRequest,
  ): Promise<CanonicalTravelerEntity | null> {
    try {
      const doc = await this.payload.findByID({
        collection: 'travelers',
        id,
        req,
      })
      if (!doc) return null
      return this.mapDocToCanonicalTraveler(doc)
    } catch {
      return null
    }
  }

  /**
   * Deterministically find an existing canonical traveler by legal travel documents:
   * Nationality + Passport / National ID Number.
   */
  async findTravelerByIdentity(
    nationality: string,
    passportNumber: string,
    req?: PayloadRequest,
  ): Promise<CanonicalTravelerEntity | null> {
    const cleanNat = nationality.trim()
    const cleanPass = passportNumber.trim()
    if (!cleanNat || !cleanPass) return null

    const result = await this.payload.find({
      collection: 'travelers',
      where: {
        and: [
          { nationality: { equals: cleanNat } },
          { passportNumber: { equals: cleanPass } },
        ],
      },
      limit: 1,
      req,
    })

    if (!result.docs || result.docs.length === 0) return null
    return this.mapDocToCanonicalTraveler(result.docs[0])
  }

  /**
   * Create a new canonical traveler in the company registry.
   */
  async createCanonicalTraveler(
    data: {
      firstName: string
      lastName: string
      email?: string
      phone?: string
      dateOfBirth?: string
      passportNumber?: string
      nationality?: string
      notes?: string
    },
    req?: PayloadRequest,
  ): Promise<CanonicalTravelerEntity> {
    try {
      const doc = await this.payload.create({
        collection: 'travelers',
        data: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email?.trim() || undefined,
          phone: data.phone?.trim() || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
          passportNumber: data.passportNumber?.trim() || undefined,
          nationality: data.nationality?.trim() || undefined,
          notes: data.notes || undefined,
        },
        req,
      })
      return this.mapDocToCanonicalTraveler(doc)
    } catch (err: any) {
      // Concurrency protection: If another request concurrently inserted the exact same traveler,
      // recover gracefully by resolving the newly created canonical traveler.
      if (
        data.nationality &&
        data.passportNumber &&
        (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique'))
      ) {
        const existing = await this.findTravelerByIdentity(data.nationality, data.passportNumber, req)
        if (existing) return existing
      }
      throw err
    }
  }

  /**
   * Deterministic resolution:
   * 1. If travelerId provided and valid -> use existing.
   * 2. If nationality + passport provided and matched -> link to existing.
   * 3. Otherwise -> create new canonical traveler.
   * NEVER performs fuzzy or unsafe matching.
   */
  async resolveOrCreateCanonicalTraveler(
    traveler: TravelerInput,
    req?: PayloadRequest,
  ): Promise<CanonicalTravelerEntity> {
    if (traveler.travelerId) {
      const existing = await this.findTravelerById(traveler.travelerId, req)
      if (existing) return existing
    }

    if (traveler.nationality && traveler.passportNumber) {
      const existing = await this.findTravelerByIdentity(
        traveler.nationality,
        traveler.passportNumber,
        req,
      )
      if (existing) return existing
    }

    return this.createCanonicalTraveler(
      {
        firstName: traveler.firstName,
        lastName: traveler.lastName,
        email: traveler.email,
        phone: traveler.phone,
        dateOfBirth: traveler.dateOfBirth,
        passportNumber: traveler.passportNumber,
        nationality: traveler.nationality,
      },
      req,
    )
  }

  /**
   * Find saved companions for a given customer account.
   * Reads from 'customer-travelers' relationship and hydrates canonical traveler data.
   */
  async findSavedCompanionsByCustomerId(
    customerId: number,
    req?: PayloadRequest,
  ): Promise<CompanionTravelerEntity[]> {
    const result = await this.payload.find({
      collection: 'customer-travelers',
      where: {
        customer: { equals: customerId },
      },
      limit: 100,
      depth: 1,
      req,
    })

    return (result.docs || []).map((doc: any) => {
      const tr = doc.traveler && typeof doc.traveler === 'object' ? doc.traveler : {}
      return {
        id: String(doc.id),
        travelerId: typeof doc.traveler === 'object' ? Number(doc.traveler.id) : Number(doc.traveler),
        customerId,
        firstName: tr.firstName || '',
        lastName: tr.lastName || '',
        email: tr.email || undefined,
        phone: tr.phone || undefined,
        dateOfBirth: tr.dateOfBirth ? new Date(tr.dateOfBirth).toISOString() : undefined,
        passportNumber: tr.passportNumber || undefined,
        nationality: tr.nationality || undefined,
        relationship: doc.relationship || 'other',
        isDefault: !!doc.isDefault,
      }
    })
  }

  /**
   * Explicit document renewal or identity update by authorized customer or administrator.
   * Preserves canonical travelerId continuity while updating legal travel documents.
   */
  async updateCanonicalTraveler(
    id: number,
    data: {
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      dateOfBirth?: string
      passportNumber?: string
      nationality?: string
      notes?: string
    },
    req?: PayloadRequest,
  ): Promise<CanonicalTravelerEntity> {
    const updateData: Record<string, any> = {}
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim()
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim()
    if (data.email !== undefined) updateData.email = data.email?.trim() || null
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth || null
    if (data.passportNumber !== undefined) updateData.passportNumber = data.passportNumber?.trim() || null
    if (data.nationality !== undefined) updateData.nationality = data.nationality?.trim() || null
    if (data.notes !== undefined) updateData.notes = data.notes || null

    const doc = await this.payload.update({
      collection: 'travelers',
      id,
      data: updateData,
      req,
    })
    return this.mapDocToCanonicalTraveler(doc)
  }

  /**
   * Save a companion relationship for a customer account.
   * Idempotent: Does not create duplicates for the same (customer, traveler) pair.
   */
  async saveCompanionRelationship(
    customerId: number,
    travelerId: number,
    relationship: 'spouse' | 'child' | 'parent' | 'friend' | 'self' | 'other' = 'other',
    isDefaultOrReq?: boolean | PayloadRequest,
    req?: PayloadRequest,
  ): Promise<void> {
    const isDefault = typeof isDefaultOrReq === 'boolean' ? isDefaultOrReq : false
    const actualReq =
      typeof isDefaultOrReq === 'object' && isDefaultOrReq !== null ? isDefaultOrReq : req

    const existing = await this.payload.find({
      collection: 'customer-travelers',
      where: {
        and: [
          { customer: { equals: customerId } },
          { traveler: { equals: travelerId } },
        ],
      },
      limit: 1,
      req: actualReq,
    })

    if (existing.docs && existing.docs.length > 0) {
      const updateData: Record<string, any> = {}
      if (relationship && existing.docs[0].relationship !== relationship) {
        updateData.relationship = relationship
      }
      if (typeof isDefaultOrReq === 'boolean' && existing.docs[0].isDefault !== isDefault) {
        updateData.isDefault = isDefault
      }
      if (Object.keys(updateData).length > 0) {
        await this.payload.update({
          collection: 'customer-travelers',
          id: existing.docs[0].id,
          data: updateData,
          req: actualReq,
        })
      }
      return
    }

    await this.payload.create({
      collection: 'customer-travelers',
      data: {
        customer: customerId,
        traveler: travelerId,
        relationship,
        isDefault,
      },
      req: actualReq,
    })
  }

  /**
   * Bounded server-side query for Traveler Registry reporting & Admin exports.
   * Strictly demand-driven with O(limit) database execution.
   */
  async getTravelersReport(options?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<PaginatedResponse<TravelerReportRecord>> {
    const page = Math.max(1, options?.page || 1)
    const limit = Math.max(1, options?.limit || 20)
    const offset = (page - 1) * limit
    const search = options?.search ? `%${options.search.trim().toLowerCase()}%` : null

    const drizzle = (this.payload.db as any)?.drizzle
    if (!drizzle || typeof drizzle.execute !== 'function') {
      throw new Error('[TravelerRepository] PostgreSQL Drizzle client is required.')
    }

    const searchCondition = search
      ? sql`WHERE (LOWER(t.first_name) LIKE ${search} OR LOWER(t.last_name) LIKE ${search} OR LOWER(COALESCE(t.email, '')) LIKE ${search} OR LOWER(COALESCE(t.passport_number, '')) LIKE ${search})`
      : sql``

    const countSql = sql`
      SELECT COUNT(t.id)::integer AS total_count
      FROM "travelers" t
      ${searchCondition};
    `

    const dataSql = sql`
      SELECT 
        t.id AS traveler_id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        t.nationality,
        t.passport_number,
        t.date_of_birth,
        COUNT(DISTINCT bt._parent_id)::integer AS total_trips_count,
        MIN(b.start_date) AS first_voyage_date,
        MAX(b.start_date) AS latest_voyage_date
      FROM "travelers" t
      LEFT JOIN "bookings_travelers" bt ON bt.traveler_id = t.id
      LEFT JOIN "bookings" b ON b.id = bt._parent_id
      ${searchCondition}
      GROUP BY t.id
      ORDER BY total_trips_count DESC, t.id DESC
      LIMIT ${limit} OFFSET ${offset};
    `

    const [countRes, rowsRes] = await Promise.all([
      drizzle.execute(countSql),
      drizzle.execute(dataSql),
    ])

    const countRow = countRes?.rows?.[0] || countRes?.[0]
    const total = Number(countRow?.total_count || 0)
    const rows = rowsRes?.rows || rowsRes || []

    const data: TravelerReportRecord[] = rows.map((r: any) => ({
      travelerId: Number(r.traveler_id),
      firstName: String(r.first_name).trim(),
      lastName: String(r.last_name).trim(),
      email: r.email || undefined,
      phone: r.phone || undefined,
      nationality: r.nationality || undefined,
      passportNumber: r.passport_number || undefined,
      dateOfBirth: r.date_of_birth ? new Date(r.date_of_birth).toISOString() : undefined,
      totalTripsCount: Number(r.total_trips_count || 0),
      firstVoyageDate: r.first_voyage_date ? new Date(r.first_voyage_date).toISOString() : undefined,
      latestVoyageDate: r.latest_voyage_date ? new Date(r.latest_voyage_date).toISOString() : undefined,
    }))

    return {
      data,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    }
  }

  private mapDocToCanonicalTraveler(doc: any): CanonicalTravelerEntity {
    return {
      id: Number(doc.id),
      firstName: String(doc.firstName).trim(),
      lastName: String(doc.lastName).trim(),
      email: doc.email || undefined,
      phone: doc.phone || undefined,
      dateOfBirth: doc.dateOfBirth ? new Date(doc.dateOfBirth).toISOString() : undefined,
      passportNumber: doc.passportNumber || undefined,
      nationality: doc.nationality || undefined,
      notes: doc.notes || undefined,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
    }
  }
}
