import type { Payload } from 'payload'
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

  async findCountries(_options?: DestinationQueryOptions) {
    return this.payload.find({
      collection: 'countries',
      where: {
        isActive: { equals: true },
      },
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

  async findCitiesByCountry(countryId: number, _options?: DestinationQueryOptions) {
    return this.payload.find({
      collection: 'cities',
      where: {
        and: [{ country: { equals: countryId } }, { isActive: { equals: true } }],
      },
      sort: 'name',
    })
  }

  async findCityById(cityId: number, _options?: DestinationQueryOptions) {
    try {
      const doc = await this.payload.findByID({
        collection: 'cities',
        id: cityId,
        depth: 1, // Populates parent country
      })
      return doc || null
    } catch {
      return null
    }
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
    try {
      const doc = await this.payload.findByID({
        collection: 'countries',
        id: countryId,
      })
      return doc || null
    } catch {
      return null
    }
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
          { city: { equals: cityId } },
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
      sort: '-createdAt',
    })

    return result.docs
  }
}
