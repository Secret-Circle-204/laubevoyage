import {
  ExperienceType,
  ExperienceAvailability,
} from '@/types'
import type { Payload, Where } from 'payload'

/**
 * Destination Domain Service
 * Handles all destination, city, and experience queries
 *
 * Golden Rule: This domain ONLY returns data in EGP and base language.
 * It NEVER performs currency conversions or translations.
 * The Localization Layer handles that before returning to the frontend.
 */
export class DestinationService {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Get all active countries
   */
  async getCountries() {
    return this.payload.find({
      collection: 'countries',
      where: {
        isActive: {
          equals: true,
        },
      },
      sort: 'name',
    })
  }

  /**
   * Get country by slug
   */
  async getCountry(slug: string) {
    const result = await this.payload.find({
      collection: 'countries',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
    })

    return result.docs[0] || null
  }

  /**
   * Get cities by country
   */
  async getCitiesByCountry(countryId: number) {
    return this.payload.find({
      collection: 'cities',
      where: {
        and: [{ country: { equals: countryId } }, { isActive: { equals: true } }],
      },
      sort: 'name',
    })
  }

  /**
   * Get city by slug
   */
  async getCity(slug: string) {
    const result = await this.payload.find({
      collection: 'cities',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
    })

    return result.docs[0] || null
  }

  /**
   * Get experiences by city
   */
  async getExperiencesByCity(
    cityId: number,
    options: {
      type?: ExperienceType
      page?: number
      limit?: number
    } = {},
  ) {
    const { type, page = 1, limit = 10 } = options

    const andConditions: Where[] = [
      { city: { equals: cityId } },
      { isActive: { equals: true } },
      { availability: { equals: ExperienceAvailability.AVAILABLE } },
    ]

    if (type) {
      andConditions.push({ type: { equals: type } })
    }

    const where: Where = {
      and: andConditions,
    }

    return this.payload.find({
      collection: 'experiences',
      where,
      page,
      limit,
    })
  }

  /**
   * Get experience by slug
   */
  async getExperience(slug: string) {
    const result = await this.payload.find({
      collection: 'experiences',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
    })

    return result.docs[0] || null
  }

  /**
   * Search experiences
   */
  async searchExperiences(
    query: string,
    options: {
      type?: ExperienceType
      page?: number
      limit?: number
    } = {},
  ) {
    const { type, page = 1, limit = 10 } = options

    const andConditions: Where[] = [
      { isActive: { equals: true } },
      { availability: { equals: ExperienceAvailability.AVAILABLE } },
      {
        or: [{ title: { contains: query } }, { description: { contains: query } }],
      },
    ]

    if (type) {
      andConditions.push({ type: { equals: type } })
    }

    const where: Where = {
      and: andConditions,
    }

    return this.payload.find({
      collection: 'experiences',
      where,
      page,
      limit,
    })
  }

  /**
   * Get featured experiences
   */
  async getFeaturedExperiences(
    options: {
      limit?: number
    } = {},
  ) {
    const { limit = 6 } = options

    const result = await this.payload.find({
      collection: 'experiences',
      where: {
        and: [
          { isActive: { equals: true } },
          { availability: { equals: ExperienceAvailability.AVAILABLE } },
        ],
      },
      limit,
      sort: '-createdAt',
    })

    return result.docs
  }
}
