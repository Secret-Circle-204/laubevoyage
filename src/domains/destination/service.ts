import {
  ExperienceType,
  ExperienceAvailability,
  CurrencyCode,
} from '@/types'
import type { Payload, Where } from 'payload'
import { CurrencyService } from '../currency/service'

/**
 * Destination Domain Service
 * Handles all destination, city, and experience queries
 */
export class DestinationService {
  private payload: Payload
  private currencyService: CurrencyService

  constructor(payload: Payload) {
    this.payload = payload
    this.currencyService = new CurrencyService(payload)
  }

  /**
   * Get all active countries
   */
  async getCountries(locale?: 'en' | 'ar' | 'fr' | 'all') {
    return this.payload.find({
      collection: 'countries',
      where: {
        isActive: {
          equals: true,
        },
      },
      sort: 'name',
      locale: locale || 'en',
    })
  }

  /**
   * Get country by slug
   */
  async getCountry(slug: string, locale?: 'en' | 'ar' | 'fr' | 'all') {
    const result = await this.payload.find({
      collection: 'countries',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
      locale: locale || 'en',
    })

    return result.docs[0] || null
  }

  /**
   * Get cities by country
   */
  async getCitiesByCountry(countryId: number, locale?: 'en' | 'ar' | 'fr' | 'all') {
    return this.payload.find({
      collection: 'cities',
      where: {
        and: [{ country: { equals: countryId } }, { isActive: { equals: true } }],
      },
      sort: 'name',
      locale: locale || 'en',
    })
  }

  /**
   * Get city by slug
   */
  async getCity(slug: string, locale?: 'en' | 'ar' | 'fr' | 'all') {
    const result = await this.payload.find({
      collection: 'cities',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
      locale: locale || 'en',
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
      locale?: 'en' | 'ar' | 'fr' | 'all'
      currency?: CurrencyCode
    } = {},
  ) {
    const { type, page = 1, limit = 10, locale = 'en', currency = CurrencyCode.EGP } = options

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

    const result = await this.payload.find({
      collection: 'experiences',
      where,
      page,
      limit,
      locale,
    })

    // Convert prices if needed
    const experiences = await Promise.all(
      result.docs.map(async (exp) => {
        if (currency !== CurrencyCode.EGP) {
          const convertedPrice = await this.currencyService.convert(
            CurrencyCode.EGP,
            currency,
            exp.price,
          )
          return {
            ...exp,
            price: convertedPrice,
            originalPrice: exp.price,
            displayCurrency: currency,
          }
        }
        return exp
      }),
    )

    return {
      ...result,
      docs: experiences,
    }
  }

  /**
   * Get experience by slug
   */
  async getExperience(
    slug: string,
    options: {
      locale?: 'en' | 'ar' | 'fr' | 'all'
      currency?: CurrencyCode
    } = {},
  ) {
    const { locale = 'en', currency = CurrencyCode.EGP } = options

    const result = await this.payload.find({
      collection: 'experiences',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
      locale,
    })

    if (!result.docs[0]) return null

    const experience = result.docs[0]

    // Convert price if needed
    if (currency !== CurrencyCode.EGP) {
      const convertedPrice = await this.currencyService.convert(
        CurrencyCode.EGP,
        currency,
        experience.price,
      )
      return {
        ...experience,
        price: convertedPrice,
        originalPrice: experience.price,
        displayCurrency: currency,
      }
    }

    return experience
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
      locale?: 'en' | 'ar' | 'fr' | 'all'
      currency?: CurrencyCode
    } = {},
  ) {
    const { type, page = 1, limit = 10, locale = 'en', currency = CurrencyCode.EGP } = options

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

    const result = await this.payload.find({
      collection: 'experiences',
      where,
      page,
      limit,
      locale,
    })

    // Convert prices
    const experiences = await Promise.all(
      result.docs.map(async (exp) => {
        if (currency !== CurrencyCode.EGP) {
          const convertedPrice = await this.currencyService.convert(
            CurrencyCode.EGP,
            currency,
            exp.price,
          )
          return {
            ...exp,
            price: convertedPrice,
            originalPrice: exp.price,
            displayCurrency: currency,
          }
        }
        return exp
      }),
    )

    return {
      ...result,
      docs: experiences,
    }
  }

  /**
   * Get featured experiences
   */
  async getFeaturedExperiences(
    options: {
      limit?: number
      locale?: 'en' | 'ar' | 'fr' | 'all'
      currency?: CurrencyCode
    } = {},
  ) {
    const { limit = 6, locale = 'en', currency = CurrencyCode.EGP } = options

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
      locale,
    })

    const experiences = await Promise.all(
      result.docs.map(async (exp) => {
        if (currency !== CurrencyCode.EGP) {
          const convertedPrice = await this.currencyService.convert(
            CurrencyCode.EGP,
            currency,
            exp.price,
          )
          return {
            ...exp,
            price: convertedPrice,
            originalPrice: exp.price,
            displayCurrency: currency,
          }
        }
        return exp
      }),
    )

    return experiences
  }
}
