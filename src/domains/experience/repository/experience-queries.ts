import type { Payload, PayloadRequest, Where } from 'payload'
import type { Experience } from '@/payload-types'
import type { ExperienceAggregate } from '../aggregate'
import type {
  ExperienceAvailabilityStatus,
  ExperienceSearchQueryParams,
  ExperienceOperationalMetadata,
} from '../types'
import { validateAvailabilityTransition } from '../state-machine'
import {
  mapExperienceDocToAggregate,
  mapExperienceDocToOperationalMetadata,
} from './experience-mapper'

/**
 * Find experience aggregate by ID.
 */
export async function findExperienceById(
  payload: Payload,
  experienceId: number,
  req?: PayloadRequest,
): Promise<ExperienceAggregate> {
  const doc = (await payload.findByID({
    collection: 'experiences',
    id: experienceId,
    req,
  })) as Experience

  return mapExperienceDocToAggregate(doc)
}

/**
 * Find lightweight operational metadata for an experience by ID without hydrating heavy sub-models (e.g. Accommodations).
 */
export async function findExperienceOperationalMetadataById(
  payload: Payload,
  experienceId: number,
  req?: PayloadRequest,
): Promise<ExperienceOperationalMetadata> {
  const doc = (await payload.findByID({
    collection: 'experiences',
    id: experienceId,
    req,
  })) as Experience

  return mapExperienceDocToOperationalMetadata(doc)
}

/**
 * Find multiple experience aggregates matching a list of experience IDs in a single query.
 */
export async function findExperiencesByIds(
  payload: Payload,
  experienceIds: number[],
  req?: PayloadRequest,
): Promise<ExperienceAggregate[]> {
  if (experienceIds.length === 0) return []
  const result = await payload.find({
    collection: 'experiences',
    where: {
      id: { in: experienceIds },
    },
    limit: experienceIds.length,
    req,
  })

  return (result.docs as Experience[]).map((doc) => mapExperienceDocToAggregate(doc))
}

/**
 * Find experience aggregate by unique slug.
 */
export async function findExperienceBySlug(
  payload: Payload,
  slug: string,
  req?: PayloadRequest,
): Promise<ExperienceAggregate | null> {
  const result = await payload.find({
    collection: 'experiences',
    where: {
      slug: { equals: slug },
    },
    limit: 1,
    req,
  })

  const doc = result.docs[0] as Experience | undefined
  return doc ? mapExperienceDocToAggregate(doc) : null
}

/**
 * Update experience availability status exclusively with State Machine validation.
 */
export async function updateExperienceAvailability(
  payload: Payload,
  experienceId: number,
  newStatus: ExperienceAvailabilityStatus,
  req?: PayloadRequest,
): Promise<ExperienceAggregate> {
  const current = await findExperienceById(payload, experienceId, req)

  validateAvailabilityTransition(current.availability, newStatus)

  const doc = (await payload.update({
    collection: 'experiences',
    id: experienceId,
    data: {
      availability: newStatus as Experience['availability'],
    },
    req,
  })) as Experience

  return mapExperienceDocToAggregate(doc)
}

/**
 * Find experiences using filters with server-side pagination and database-side ranking.
 */
export async function findFilteredExperiences(
  payload: Payload,
  params: ExperienceSearchQueryParams,
  req?: PayloadRequest,
): Promise<{
  docs: ExperienceAggregate[]
  totalDocs: number
  totalPages: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}> {
  const conditions: Where[] = []

  // Active status constraint (defaults to true)
  if (params.isActive !== false) {
    conditions.push({ isActive: { equals: true } })
  }

  // Exact ID filter
  if (params.ids && params.ids.length > 0) {
    conditions.push({ id: { in: params.ids } })
  }

  // Text keyword search across title and seo.keywords (with cross-language translation discovery)
  if (params.keyword && params.keyword.trim().length > 0) {
    const kw = params.keyword.trim()
    const matchingKeywords = [kw]

    try {
      const transDocs = await payload.find({
        collection: 'translation-cache',
        where: {
          or: [
            { translatedText: { contains: kw } },
            { sourceText: { contains: kw } },
          ],
        },
        limit: 5,
        req,
      })

      for (const t of transDocs.docs) {
        if (t.sourceText && !matchingKeywords.includes(t.sourceText)) {
          matchingKeywords.push(t.sourceText)
        }
        if (t.translatedText && !matchingKeywords.includes(t.translatedText)) {
          matchingKeywords.push(t.translatedText)
        }
      }
    } catch {}

    const keywordOrConditions: Where[] = []
    for (const k of matchingKeywords) {
      keywordOrConditions.push({ title: { contains: k } })
      keywordOrConditions.push({ 'seo.keywords': { contains: k } })
    }

    conditions.push({
      or: keywordOrConditions,
    })


  }


  // Type filter
  if (params.type) {
    conditions.push({ type: { equals: params.type } })
  }

  // City filter (matches either Origin city or any Journey destination stop)
  if (params.cityId) {
    conditions.push({
      or: [
        { city: { equals: params.cityId } },
        { destinations: { in: [params.cityId] } },
      ],
    })
  }

  // Country resolution filter (matches if origin city OR any destination stop belongs to the country)
  if (params.countryId) {
    const citiesInCountry = await payload.find({
      collection: 'cities',
      where: {
        and: [
          { country: { equals: params.countryId } },
          { isActive: { equals: true } },
        ],
      },
      limit: 200,
      req,
    })
    const cityIds = citiesInCountry.docs.map((c) => Number(c.id))
    if (cityIds.length > 0) {
      conditions.push({
        or: [
          { city: { in: cityIds } },
          { destinations: { in: cityIds } },
        ],
      })
    } else {
      // No cities exist for this country -> return empty page
      conditions.push({ id: { equals: -1 } })
    }
  }

  // Departure date filtering (matches available package departure slots or active daily tours)
  if (params.departureDate) {
    try {
      const activeSlots = await payload.find({
        collection: 'departure-slots',
        where: {
          and: [
            { date: { equals: params.departureDate } },
            { status: { equals: 'available' } },
            { capacityAvailable: { greater_than: 0 } },
          ],
        },
        limit: 500,
        req,
      })

      const packageExpIds = Array.from(
        new Set(
          activeSlots.docs.map((s) =>
            typeof s.experience === 'object' ? Number(s.experience.id) : Number(s.experience)
          )
        )
      )

      if (params.type === 'package') {
        if (packageExpIds.length > 0) {
          conditions.push({ id: { in: packageExpIds } })
        } else {
          conditions.push({ id: { equals: -1 } })
        }
      } else if (params.type === 'daily_tour') {
        conditions.push({ type: { equals: 'daily_tour' } })
      } else {
        if (packageExpIds.length > 0) {
          conditions.push({
            or: [
              { id: { in: packageExpIds } },
              { type: { equals: 'daily_tour' } },
            ],
          })
        } else {
          conditions.push({ type: { equals: 'daily_tour' } })
        }
      }
    } catch {}
  }

  // Availability filter
  if (params.availability) {
    conditions.push({ availability: { equals: params.availability } })
  }


  // Price range filters
  if (params.minPriceEGP !== undefined) {
    conditions.push({ price: { greater_than_equal: params.minPriceEGP } })
  }
  if (params.maxPriceEGP !== undefined) {
    conditions.push({ price: { less_than_equal: params.maxPriceEGP } })
  }

  // Duration filters (Package days)
  if (params.minDurationDays !== undefined) {
    conditions.push({ 'duration.days': { greater_than_equal: params.minDurationDays } })
  }
  if (params.maxDurationDays !== undefined) {
    conditions.push({ 'duration.days': { less_than_equal: params.maxDurationDays } })
  }

  // Duration filters (Daily tour minutes)
  if (params.minDurationMinutes !== undefined) {
    conditions.push({ 'duration.durationMinutes': { greater_than_equal: params.minDurationMinutes } })
  }
  if (params.maxDurationMinutes !== undefined) {
    conditions.push({ 'duration.durationMinutes': { less_than_equal: params.maxDurationMinutes } })
  }

  const where: Where = conditions.length > 0 ? { and: conditions } : {}
  const page = params.page || 1
  const limit = params.limit || 12
  const sort = params.sort || '-createdAt'

  const result = await payload.find({
    collection: 'experiences',
    where,
    page,
    limit,
    sort,
    req,
  })

  return {
    docs: (result.docs as Experience[]).map((doc) => mapExperienceDocToAggregate(doc)),
    totalDocs: result.totalDocs,
    totalPages: result.totalPages || 1,
    page: result.page || page,
    limit: result.limit || limit,
    hasNextPage: result.hasNextPage || false,
    hasPrevPage: result.hasPrevPage || false,
  }
}

/**
 * Find related experiences using bounded showcase contract (limit: 3).
 * Prioritizes: Same City & Same Type -> Same City -> Same Type.
 */
export async function findRelatedExperiences(
  payload: Payload,
  experienceId: number,
  cityId: number,
  type: string,
  limit: number = 3,
  req?: PayloadRequest,
): Promise<ExperienceAggregate[]> {
  const boundedLimit = Math.min(Math.max(1, limit), 6)

  // 1. Primary: Same City and Same Type
  const primary = await payload.find({
    collection: 'experiences',
    where: {
      and: [
        { id: { not_equals: experienceId } },
        { isActive: { equals: true } },
        { city: { equals: cityId } },
        { type: { equals: type } },
      ],
    },
    limit: boundedLimit,
    sort: '-createdAt',
    req,
  })

  const results = (primary.docs as Experience[]).map((d) => mapExperienceDocToAggregate(d))
  if (results.length >= boundedLimit) {
    return results.slice(0, boundedLimit)
  }

  // 2. Secondary: Same City (different type)
  const existingIds = [experienceId, ...results.map((r) => r.id)]
  const remaining = boundedLimit - results.length

  const secondary = await payload.find({
    collection: 'experiences',
    where: {
      and: [
        { id: { not_in: existingIds } },
        { isActive: { equals: true } },
        { city: { equals: cityId } },
      ],
    },
    limit: remaining,
    sort: '-createdAt',
    req,
  })

  for (const doc of secondary.docs as Experience[]) {
    results.push(mapExperienceDocToAggregate(doc))
  }

  if (results.length >= boundedLimit) {
    return results.slice(0, boundedLimit)
  }

  // 3. Fallback: Same Type (different city)
  const allIds = [experienceId, ...results.map((r) => r.id)]
  const stillRemaining = boundedLimit - results.length

  const tertiary = await payload.find({
    collection: 'experiences',
    where: {
      and: [
        { id: { not_in: allIds } },
        { isActive: { equals: true } },
        { type: { equals: type } },
      ],
    },
    limit: stillRemaining,
    sort: '-createdAt',
    req,
  })

  for (const doc of tertiary.docs as Experience[]) {
    results.push(mapExperienceDocToAggregate(doc))
  }

  return results.slice(0, boundedLimit)
}

