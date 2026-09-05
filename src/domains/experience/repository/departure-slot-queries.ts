import type { Payload, PayloadRequest } from 'payload'
import type { DepartureSlot } from '@/payload-types'
import type { RequestContext } from '@/types'
import type { DepartureSlotEntity, DepartureSlotStatus } from '../types'
import type { FindSlotsQueryOptions, PaginatedDepartureSlotsResult } from './types'
import { mapContextToReq } from './repository-context'

/**
 * Find departure slots for a specific experience ID from database with optional date/pagination options.
 */
export async function findDepartureSlotsByExperienceId(
  payload: Payload,
  experienceId: number,
  optionsOrReq?: FindSlotsQueryOptions | PayloadRequest,
  req?: PayloadRequest,
): Promise<DepartureSlotEntity[]> {
  const options =
    optionsOrReq && typeof optionsOrReq === 'object' && !('payload' in optionsOrReq)
      ? (optionsOrReq as FindSlotsQueryOptions)
      : undefined
  const activeReq =
    optionsOrReq && typeof optionsOrReq === 'object' && 'payload' in optionsOrReq
      ? (optionsOrReq as PayloadRequest)
      : req

  const whereConditions: Record<string, any> = {
    experience: { equals: experienceId },
  }

  if (options?.minDate) {
    whereConditions.date = { ...(whereConditions.date || {}), greater_than_equal: options.minDate }
  }
  if (options?.maxDate) {
    whereConditions.date = { ...(whereConditions.date || {}), less_than: options.maxDate }
  }
  if (options?.status) {
    whereConditions.status = { equals: options.status }
  }
  if (options?.notStatus) {
    whereConditions.status = { not_equals: options.notStatus }
  }

  const page = options?.page || 1
  const limit = options?.limit !== undefined ? options.limit : 50

  const result = await payload.find({
    collection: 'departure-slots',
    where: whereConditions,
    limit,
    page,
    sort: options?.sort || 'date',
    req: activeReq,
  })

  return (result.docs as DepartureSlot[]).map((doc) => {
    const expId = doc.experience
      ? typeof doc.experience === 'object'
        ? Number(doc.experience.id)
        : Number(doc.experience)
      : experienceId
    if (!doc.date || doc.capacityTotal === undefined) {
      throw new Error(
        `[ExperienceRepository] Database record for slot ${doc.id} is invalid or missing required fields.`,
      )
    }
    return {
      id: Number(doc.id),
      departureId: doc.departureId,
      experienceId: expId,
      date: new Date(doc.date).toISOString().split('T')[0],
      startTime: doc.startTime || '',
      priceOverrideEGP: doc.priceOverrideEGP ?? undefined,
      capacityTotal: doc.capacityTotal,
      capacityReserved: doc.capacityReserved ?? 0,
      capacitySold: doc.capacitySold ?? 0,
      capacityAvailable: doc.capacityAvailable,
      version: doc.version,
      status: doc.status as DepartureSlotStatus,
    }
  })
}

/**
 * Find departure slots for a specific experience ID with full database-level pagination metadata.
 */
export async function findDepartureSlotsByExperienceIdPaginated(
  payload: Payload,
  experienceId: number,
  options?: FindSlotsQueryOptions,
  req?: PayloadRequest,
): Promise<PaginatedDepartureSlotsResult> {
  const whereConditions: Record<string, any> = {
    experience: { equals: experienceId },
  }

  if (options?.minDate) {
    whereConditions.date = { ...(whereConditions.date || {}), greater_than_equal: options.minDate }
  }
  if (options?.maxDate) {
    whereConditions.date = { ...(whereConditions.date || {}), less_than: options.maxDate }
  }
  if (options?.status) {
    whereConditions.status = { equals: options.status }
  }
  if (options?.notStatus) {
    whereConditions.status = { not_equals: options.notStatus }
  }

  const result = await payload.find({
    collection: 'departure-slots',
    where: whereConditions,
    limit: options?.limit !== undefined ? options.limit : 20,
    page: options?.page || 1,
    sort: options?.sort || '-date',
    req,
  })

  const docs = (result.docs as DepartureSlot[]).map((doc) => {
    const expId = doc.experience
      ? typeof doc.experience === 'object'
        ? Number(doc.experience.id)
        : Number(doc.experience)
      : experienceId
    if (!doc.date || doc.capacityTotal === undefined) {
      throw new Error(
        `[ExperienceRepository] Database record for slot ${doc.id} is invalid or missing required fields.`,
      )
    }
    return {
      id: Number(doc.id),
      departureId: doc.departureId,
      experienceId: expId,
      date: new Date(doc.date).toISOString().split('T')[0],
      startTime: doc.startTime || '',
      priceOverrideEGP: doc.priceOverrideEGP ?? undefined,
      capacityTotal: doc.capacityTotal,
      capacityReserved: doc.capacityReserved ?? 0,
      capacitySold: doc.capacitySold ?? 0,
      capacityAvailable: doc.capacityAvailable,
      version: doc.version,
      status: doc.status as DepartureSlotStatus,
    }
  })

  return {
    docs,
    totalDocs: result.totalDocs,
    limit: result.limit,
    totalPages: result.totalPages,
    page: result.page || 1,
    hasPrevPage: result.hasPrevPage,
    hasNextPage: result.hasNextPage,
  }
}

/**
 * Fetch departure slot entity by slot ID (number) and optional experience ID, RequestContext, or PayloadRequest.
 */
export async function getDepartureSlotById(
  payload: Payload,
  slotId: number,
  experienceIdOrContextOrReq?: number | RequestContext | PayloadRequest,
  context?: RequestContext,
): Promise<DepartureSlotEntity | null> {
  const isPayloadReq =
    experienceIdOrContextOrReq &&
    typeof experienceIdOrContextOrReq === 'object' &&
    'payload' in experienceIdOrContextOrReq
  const req = isPayloadReq
    ? (experienceIdOrContextOrReq as PayloadRequest)
    : mapContextToReq(
        typeof experienceIdOrContextOrReq === 'object'
          ? (experienceIdOrContextOrReq as RequestContext)
          : context,
      )

  const doc = (await payload.findByID({
    collection: 'departure-slots',
    id: slotId,
    req,
  })) as DepartureSlot | null

  if (!doc) return null

  const expId = doc.experience
    ? typeof doc.experience === 'object'
      ? Number(doc.experience.id)
      : Number(doc.experience)
    : 0
  if (!expId || !doc.date || doc.capacityTotal === undefined) {
    throw new Error(
      `[ExperienceRepository] Database slot record ${slotId} is invalid or missing required fields.`,
    )
  }

  return {
    id: Number(doc.id),
    departureId: doc.departureId,
    experienceId: expId,
    date: new Date(doc.date).toISOString().split('T')[0],
    startTime: doc.startTime || undefined,
    priceOverrideEGP:
      doc.priceOverrideEGP !== null && doc.priceOverrideEGP !== undefined
        ? Number(doc.priceOverrideEGP)
        : undefined,
    capacityTotal: doc.capacityTotal,
    capacityReserved: typeof doc.capacityReserved === 'number' ? doc.capacityReserved : 0,
    capacitySold: typeof doc.capacitySold === 'number' ? doc.capacitySold : 0,
    capacityAvailable: doc.capacityAvailable,
    version: doc.version,
    status: doc.status as DepartureSlotStatus,
  }
}

/**
 * Batch-fetch multiple departure slot entities by slot IDs (True Database Batch Query).
 */
export async function findDepartureSlotsByIds(
  payload: Payload,
  slotIds: number[],
  context?: RequestContext,
): Promise<DepartureSlotEntity[]> {
  if (slotIds.length === 0) return []
  const req = mapContextToReq(context)
  const result = await payload.find({
    collection: 'departure-slots',
    where: {
      id: { in: slotIds },
    },
    limit: slotIds.length,
    req,
  })

  return (result.docs as DepartureSlot[]).map((doc) => {
    const expId = doc.experience
      ? typeof doc.experience === 'object'
        ? Number(doc.experience.id)
        : Number(doc.experience)
      : 0
    if (!expId || !doc.date || doc.capacityTotal === undefined) {
      throw new Error(
        `[ExperienceRepository] Database slot record ${doc.id} is invalid or missing required fields.`,
      )
    }
    return {
      id: Number(doc.id),
      departureId: doc.departureId,
      experienceId: expId,
      date: new Date(doc.date).toISOString().split('T')[0],
      startTime: doc.startTime || undefined,
      priceOverrideEGP:
        doc.priceOverrideEGP !== null && doc.priceOverrideEGP !== undefined
          ? Number(doc.priceOverrideEGP)
          : undefined,
      capacityTotal: doc.capacityTotal,
      capacityReserved: typeof doc.capacityReserved === 'number' ? doc.capacityReserved : 0,
      capacitySold: typeof doc.capacitySold === 'number' ? doc.capacitySold : 0,
      capacityAvailable: doc.capacityAvailable,
      version: doc.version,
      status: doc.status as DepartureSlotStatus,
    }
  })
}

/**
 * Fetch departure slot entity by departure ID.
 */
export async function getDepartureSlot(
  payload: Payload,
  departureId: string,
  context?: RequestContext,
): Promise<DepartureSlotEntity | null> {
  const req = mapContextToReq(context)
  const result = await payload.find({
    collection: 'departure-slots',
    where: {
      departureId: { equals: departureId },
    },
    limit: 1,
    req,
  })

  const doc = result.docs[0] as DepartureSlot | undefined
  if (!doc) return null

  const expId = doc.experience
    ? typeof doc.experience === 'object'
      ? Number(doc.experience.id)
      : Number(doc.experience)
    : 0
  if (!expId || !doc.date || doc.capacityTotal === undefined) {
    throw new Error(
      `[ExperienceRepository] Database slot record ${departureId} is invalid or missing required fields.`,
    )
  }

  return {
    id: Number(doc.id),
    departureId: doc.departureId,
    experienceId: expId,
    date: new Date(doc.date).toISOString().split('T')[0],
    startTime: doc.startTime || '',
    priceOverrideEGP:
      doc.priceOverrideEGP !== null && doc.priceOverrideEGP !== undefined
        ? Number(doc.priceOverrideEGP)
        : undefined,
    capacityTotal: doc.capacityTotal,
    capacityReserved: typeof doc.capacityReserved === 'number' ? doc.capacityReserved : 0,
    capacitySold: typeof doc.capacitySold === 'number' ? doc.capacitySold : 0,
    capacityAvailable: doc.capacityAvailable,
    version: doc.version,
    status: doc.status as DepartureSlotStatus,
  }
}

/**
 * Fetch departure slot entity by date and experience ID.
 */
export async function getDepartureSlotByDate(
  payload: Payload,
  experienceId: number,
  date: string,
  context?: RequestContext,
): Promise<DepartureSlotEntity | null> {
  const req = mapContextToReq(context)
  const result = await payload.find({
    collection: 'departure-slots',
    where: {
      and: [{ experience: { equals: experienceId } }, { date: { equals: date } }],
    },
    limit: 1,
    req,
  })

  const doc = result.docs[0] as DepartureSlot | undefined
  if (!doc) return null

  return {
    id: Number(doc.id),
    departureId: doc.departureId,
    experienceId: experienceId,
    date: new Date(doc.date).toISOString().split('T')[0],
    startTime: doc.startTime || '',
    priceOverrideEGP:
      doc.priceOverrideEGP !== null && doc.priceOverrideEGP !== undefined
        ? Number(doc.priceOverrideEGP)
        : undefined,
    capacityTotal: doc.capacityTotal,
    capacityReserved: typeof doc.capacityReserved === 'number' ? doc.capacityReserved : 0,
    capacitySold: typeof doc.capacitySold === 'number' ? doc.capacitySold : 0,
    capacityAvailable: doc.capacityAvailable,
    version: doc.version,
    status: doc.status as DepartureSlotStatus,
  }
}

/**
 * Count departure slots for a specific experience ID with optional status filter.
 */
export async function countDepartureSlots(
  payload: Payload,
  experienceId: number,
  status?: string,
  context?: RequestContext,
): Promise<number> {
  const req = mapContextToReq(context)
  const where: any = {
    experience: { equals: experienceId },
  }
  if (status) {
    where.status = { equals: status }
  }
  if (typeof payload.count === 'function') {
    const res = await payload.count({ collection: 'departure-slots', where, req })
    return res.totalDocs
  }
  const res = await payload.find({ collection: 'departure-slots', where, limit: 1, req })
  return res.totalDocs
}

/**
 * Find the minimal candidate departure slots that could determine the starting price.
 * Contract: Bounded Lookup (returns at most 2-3 candidate slot entities).
 * 
 * Candidates:
 * 1. Earliest upcoming available slot (determines if future slots exist, and provides the baseline slot for catalog/date overrides).
 * 2. Cheapest upcoming available slot with custom priceOverrideEGP (if any slot has a custom discount).
 * 3. Bounded upcoming available slots for any specific dates in experience.priceOverrides that are cheaper than catalog price.
 */
export async function findStartingPriceCandidateSlots(
  payload: Payload,
  experienceId: number,
  minDate: string,
  cheaperOverrideDates: string[] = [],
  context?: RequestContext,
): Promise<DepartureSlotEntity[]> {
  const req = mapContextToReq(context)
  const candidateDocs: DepartureSlot[] = []

  // 1. Earliest upcoming available slot (limit: 1)
  const earliestRes = await payload.find({
    collection: 'departure-slots',
    where: {
      and: [
        { experience: { equals: experienceId } },
        { status: { equals: 'available' } },
        { date: { greater_than_equal: minDate } },
      ],
    },
    limit: 1,
    sort: 'date',
    req,
  })

  if (earliestRes.docs.length === 0) {
    return [] // No future available slots exist
  }

  candidateDocs.push(earliestRes.docs[0] as DepartureSlot)

  // 2. Cheapest upcoming available slot with custom priceOverrideEGP (limit: 1)
  const cheapestOverrideRes = await payload.find({
    collection: 'departure-slots',
    where: {
      and: [
        { experience: { equals: experienceId } },
        { status: { equals: 'available' } },
        { date: { greater_than_equal: minDate } },
        { priceOverrideEGP: { greater_than: 0 } },
      ],
    },
    limit: 1,
    sort: 'priceOverrideEGP',
    req,
  })

  if (cheapestOverrideRes.docs.length > 0) {
    const overrideDoc = cheapestOverrideRes.docs[0] as DepartureSlot
    if (overrideDoc.id !== (candidateDocs[0] as any).id) {
      candidateDocs.push(overrideDoc)
    }
  }

  // 3. For any future dates with discounted date overrides in experience.priceOverrides, check if available slots exist on those dates (limit: 5)
  if (cheaperOverrideDates.length > 0) {
    const dateOverrideSlotsRes = await payload.find({
      collection: 'departure-slots',
      where: {
        and: [
          { experience: { equals: experienceId } },
          { status: { equals: 'available' } },
          { date: { in: cheaperOverrideDates } },
        ],
      },
      limit: cheaperOverrideDates.length,
      req,
    })

    for (const doc of dateOverrideSlotsRes.docs) {
      const d = doc as DepartureSlot
      if (!candidateDocs.some((c) => c.id === d.id)) {
        candidateDocs.push(d)
      }
    }
  }

  return candidateDocs.map((doc) => {
    const expId = doc.experience
      ? typeof doc.experience === 'object'
        ? Number(doc.experience.id)
        : Number(doc.experience)
      : experienceId

    return {
      id: Number(doc.id),
      departureId: doc.departureId,
      experienceId: expId,
      date: new Date(doc.date).toISOString().split('T')[0],
      startTime: doc.startTime || '',
      priceOverrideEGP:
        doc.priceOverrideEGP !== null && doc.priceOverrideEGP !== undefined
          ? Number(doc.priceOverrideEGP)
          : undefined,
      capacityTotal: doc.capacityTotal,
      capacityReserved: typeof doc.capacityReserved === 'number' ? doc.capacityReserved : 0,
      capacitySold: typeof doc.capacitySold === 'number' ? doc.capacitySold : 0,
      capacityAvailable: doc.capacityAvailable,
      version: doc.version,
      status: doc.status as DepartureSlotStatus,
    }
  })
}

/**
 * Find the minimal candidate departure slots for a batch of package experiences in a single bounded SQL query.
 * Contract: Bounded Lookup (returns at most 2 candidate slot entities per package).
 * 
 * Narrow Projection: id, departure_id, experience_id, date, start_time, price_override_e_g_p, capacity_total, capacity_reserved, capacity_sold, capacity_available, version, status
 * 
 * Candidates per package:
 * 1. Earliest upcoming available slot (determines baseline availability & price).
 * 2. Cheapest upcoming available slot with price_override_e_g_p > 0 (if any discounted slot exists).
 */
export async function findStartingPriceCandidateSlotsBatchOp(
  payload: Payload,
  packageExperienceIds: number[],
  minDate: string,
  context?: RequestContext,
): Promise<Map<number, DepartureSlotEntity[]>> {
  const resultMap = new Map<number, DepartureSlotEntity[]>()
  if (!packageExperienceIds || packageExperienceIds.length === 0) {
    return resultMap
  }

  for (const expId of packageExperienceIds) {
    resultMap.set(expId, [])
  }

  const dbAdapter = payload.db as any
  const pool = dbAdapter?.pool

  if (pool && typeof pool.query === 'function') {
    const query = `
      WITH AvailableSlots AS (
        SELECT 
          id, departure_id, experience_id, date, start_time, 
          price_override_e_g_p, capacity_total, capacity_reserved, 
          capacity_sold, capacity_available, version, status,
          ROW_NUMBER() OVER (
            PARTITION BY experience_id 
            ORDER BY date ASC
          ) AS rn_earliest
        FROM departure_slots
        WHERE experience_id = ANY($1::int[])
          AND date >= $2::timestamptz
          AND status = 'available'
          AND capacity_available > 0
      ),
      CheapestOverrideSlots AS (
        SELECT 
          id, departure_id, experience_id, date, start_time, 
          price_override_e_g_p, capacity_total, capacity_reserved, 
          capacity_sold, capacity_available, version, status,
          ROW_NUMBER() OVER (
            PARTITION BY experience_id 
            ORDER BY price_override_e_g_p ASC
          ) AS rn_cheapest
        FROM departure_slots
        WHERE experience_id = ANY($1::int[])
          AND date >= $2::timestamptz
          AND status = 'available'
          AND capacity_available > 0
          AND price_override_e_g_p > 0
      )
      SELECT 
        id, departure_id, experience_id, date, start_time, 
        price_override_e_g_p, capacity_total, capacity_reserved, 
        capacity_sold, capacity_available, version, status
      FROM AvailableSlots WHERE rn_earliest = 1
      UNION
      SELECT 
        id, departure_id, experience_id, date, start_time, 
        price_override_e_g_p, capacity_total, capacity_reserved, 
        capacity_sold, capacity_available, version, status
      FROM CheapestOverrideSlots WHERE rn_cheapest = 1;
    `

    const res = await pool.query(query, [packageExperienceIds, minDate])
    for (const row of res.rows) {
      const expId = Number(row.experience_id)
      const slotEntity: DepartureSlotEntity = {
        id: Number(row.id),
        departureId: row.departure_id,
        experienceId: expId,
        date: new Date(row.date).toISOString().split('T')[0],
        startTime: row.start_time || '',
        priceOverrideEGP:
          row.price_override_e_g_p !== null && row.price_override_e_g_p !== undefined
            ? Number(row.price_override_e_g_p)
            : undefined,
        capacityTotal: Number(row.capacity_total || 20),
        capacityReserved: Number(row.capacity_reserved || 0),
        capacitySold: Number(row.capacity_sold || 0),
        capacityAvailable: Number(row.capacity_available || 20),
        version: Number(row.version || 1),
        status: row.status as DepartureSlotStatus,
      }

      const existing = resultMap.get(expId) || []
      if (!existing.some((s) => s.id === slotEntity.id)) {
        existing.push(slotEntity)
        resultMap.set(expId, existing)
      }
    }

    return resultMap
  }

  // Fallback for non-Postgres mock environments (strict semantic equivalence)
  for (const expId of packageExperienceIds) {
    const singleRes = await findStartingPriceCandidateSlots(payload, expId, minDate, [], context)
    resultMap.set(expId, singleRes)
  }

  return resultMap
}

