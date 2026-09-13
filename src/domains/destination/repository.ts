import type { Payload, Where } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type { DestinationQueryOptions } from './types'

/**
 * Destination Repository (Clean Single Source of Truth Access)
 * Retrieves original canonical entities from Payload CMS.
 * Language-agnostic persistence layer following Option B Architecture.
 */
export class DestinationRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findCountries(options?: DestinationQueryOptions) {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    return this.payload.find({
      collection: 'countries',
      where: {
        isActive: { equals: true },
      },
      page,
      limit,
      sort: 'name',
    })
  }

  async findCountryBySlug(slug: string, _options?: DestinationQueryOptions) {
    const result = await this.payload.find({
      collection: 'countries',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
    })

    return result.docs[0] || null
  }

  async findCitiesByCountry(countryId: number, options?: { page?: number; limit?: number }) {
    const page = options?.page || 1
    const limit = options?.limit || 20
    return this.payload.find({
      collection: 'cities',
      where: {
        and: [{ country: { equals: countryId } }, { isActive: { equals: true } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        description: true,
        hero: true,
      },
      page,
      limit,
      sort: 'name',
    })
  }

  /**
   * Count active cities grouped by country ID in 1 SINGLE SQL aggregate query.
   * Database Aggregation Contract: Exactly ONE grouped database query.
   * On infrastructure/database failure, the error is cleanly propagated without silent N+1 degradation.
   */
  async getCitiesCountGroupedByCountry(countryIds: number[]): Promise<Map<number, number>> {
    const countsMap = new Map<number, number>()
    if (countryIds.length === 0) return countsMap

    for (const cId of countryIds) {
      countsMap.set(cId, 0)
    }

    const pool = (this.payload.db as any)?.pool

    const drizzle = (this.payload.db as any)?.drizzle

    if (pool && typeof pool.query === 'function') {
      const sqlString = `
        SELECT 
          "country_id"::integer AS country_id,
          COUNT(id)::integer AS count
        FROM "cities"
        WHERE "is_active" = true AND "country_id" = ANY($1::int[])
        GROUP BY "country_id";
      `
      const result = await pool.query(sqlString, [countryIds])
      const rows = result?.rows || []
      for (const row of rows) {
        countsMap.set(Number(row.country_id), Number(row.count || 0))
      }
    } else if (drizzle && typeof drizzle.execute === 'function') {
      const query = sql`
        SELECT 
          "country_id"::integer AS country_id,
          COUNT(id)::integer AS count
        FROM "cities"
        WHERE "is_active" = true AND "country_id" = ANY(ARRAY[${sql.join(countryIds.map((id) => sql`${id}`), sql`, `)}])
        GROUP BY "country_id"
      `
      const result = await drizzle.execute(query)
      const rows = result?.rows || result || []
      for (const row of rows) {
        countsMap.set(Number(row.country_id), Number(row.count || 0))
      }
    } else {
      throw new Error(
        '[DestinationRepository] Database adapter does not support direct SQL execution. PostgreSQL Drizzle client is required for grouped aggregations.',
      )
    }

    return countsMap
  }



  /**
   * Fetch a bounded showcase list of featured active cities for UI overview presentation.
   * Explicit UI Showcase Contract (e.g. 8 popular cities).
   */
  async findFeaturedCities(limit: number = 8, _options?: DestinationQueryOptions) {
    const result = await this.payload.find({
      collection: 'cities',
      where: {
        isActive: { equals: true },
      },
      limit,
      depth: 1, // Populates parent country
      sort: 'name',
    })
    return result.docs
  }

  /**
   * Batch-fetch active cities for multiple country IDs in 1 single database query.
   * Kept for targeted multi-country batch queries with explicit options.
   */
  async findCitiesByCountryIds(countryIds: number[], options?: { page?: number; limit?: number }) {
    if (countryIds.length === 0) return []
    const page = options?.page || 1
    const limit = options?.limit || 50
    const result = await this.payload.find({
      collection: 'cities',
      where: {
        and: [{ country: { in: countryIds } }, { isActive: { equals: true } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        description: true,
        hero: true,
      },
      page,
      limit,
      sort: 'name',
    })
    return result.docs
  }

  async findAllActiveCities(options?: { page?: number; limit?: number }) {
    const page = options?.page || 1
    const limit = options?.limit || 20
    return this.payload.find({
      collection: 'cities',
      where: {
        isActive: { equals: true },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        description: true,
        hero: true,
      },
      page,
      limit,
      sort: 'name',
    })
  }

  async findCityById(cityId: number, _options?: DestinationQueryOptions) {
    const result = await this.payload.find({
      collection: 'cities',
      where: {
        id: { equals: cityId },
      },
      limit: 1,
      depth: 1, // Populates parent country
    })
    return result.docs[0] || null
  }

  /**
   * Batch-fetch cities by IDs (True Database Batch Query with parent country populated).
   */
  async findCitiesByIds(cityIds: number[], _options?: DestinationQueryOptions) {
    if (cityIds.length === 0) return []
    const result = await this.payload.find({
      collection: 'cities',
      where: {
        id: { in: cityIds },
      },
      limit: cityIds.length,
      depth: 1, // Populates parent country
    })
    return result.docs
  }

  async findCountryById(countryId: number, _options?: DestinationQueryOptions) {
    const result = await this.payload.find({
      collection: 'countries',
      where: {
        id: { equals: countryId },
      },
      limit: 1,
    })
    return result.docs[0] || null
  }

  async findCityBySlug(slug: string, _options?: DestinationQueryOptions) {
    const result = await this.payload.find({
      collection: 'cities',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
    })

    return result.docs[0] || null
  }

  async findExperiencesByCity(cityId: number, options?: DestinationQueryOptions) {
    const { page = 1, limit = 10 } = options || {}

    return this.payload.find({
      collection: 'experiences',
      where: {
        and: [
          {
            or: [
              { city: { equals: cityId } },
              { destinations: { in: [cityId] } },
            ],
          },
          { isActive: { equals: true } },
        ],
      },
      page,
      limit,
    })
  }

  async findFeaturedExperiences(limit: number = 6, _options?: DestinationQueryOptions) {
    const result = await this.payload.find({
      collection: 'experiences',
      where: {
        isActive: { equals: true },
      },
      limit,
      depth: 2,
      sort: '-createdAt',
    })

    return result.docs
  }

  /**
   * Resolves a city entity from a user search term (matches slug or name).
   * Backed directly by PostgreSQL cities collection, zero hardcoded synonyms.
   */
  async findCanonicalCity(query: string) {
    if (!query || !query.trim()) return null
    const clean = query.trim().toLowerCase()

    // 1. Exact match on slug or name
    const exact = await this.payload.find({
      collection: 'cities',
      where: {
        and: [
          { isActive: { equals: true } },
          {
            or: [
              { slug: { equals: clean } },
              { name: { equals: clean } },
            ],
          },
        ],
      },
      limit: 1,
    })

    if (exact.docs.length > 0) {
      return exact.docs[0]
    }

    // 2. Substring match on name
    const partial = await this.payload.find({
      collection: 'cities',
      where: {
        and: [
          { isActive: { equals: true } },
          { name: { contains: clean } },
        ],
      },
      limit: 1,
    })

    if (partial.docs.length > 0) {
      return partial.docs[0]
    }

    // 3. Dynamic multilingual match via translation-cache
    const transMatch = await this.payload.find({
      collection: 'translation-cache',
      where: {
        translatedText: { contains: clean },
      },
      limit: 1,
    })

    if (transMatch.docs.length > 0) {
      const sourceCityName = transMatch.docs[0].sourceText
      const translatedCity = await this.payload.find({
        collection: 'cities',
        where: {
          and: [
            { isActive: { equals: true } },
            { name: { contains: sourceCityName } },
          ],
        },
        limit: 1,
      })
      if (translatedCity.docs.length > 0) {
        return translatedCity.docs[0]
      }
    }

    return null
  }

}

