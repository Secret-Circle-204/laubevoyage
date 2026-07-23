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
