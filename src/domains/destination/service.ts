import { DestinationRepository } from './repository'
import type { DestinationQueryOptions } from './types'

/**
 * Destination Domain Service
 * Handles all destination, city, and experience queries.
 * Delegated 100% to DestinationRepository via Dependency Injection.
 */
export class DestinationService {
  private repository: DestinationRepository

  constructor(repository: DestinationRepository) {
    this.repository = repository
  }

  async getCountries(options?: DestinationQueryOptions) {
    return this.repository.findCountries(options)
  }

  async getCountry(slug: string, options?: DestinationQueryOptions) {
    return this.repository.findCountryBySlug(slug, options)
  }

  async getCitiesByCountry(countryId: number, options?: { page?: number; limit?: number } & DestinationQueryOptions) {
    return this.repository.findCitiesByCountry(countryId, options)
  }

  async getCitiesCountGroupedByCountry(countryIds: number[]) {
    return this.repository.getCitiesCountGroupedByCountry(countryIds)
  }

  async getFeaturedCities(limit: number = 8, options?: DestinationQueryOptions) {
    return this.repository.findFeaturedCities(limit, options)
  }

  async getCitiesByCountryIds(countryIds: number[], options?: { page?: number; limit?: number }) {
    return this.repository.findCitiesByCountryIds(countryIds, options)
  }

  async getAllActiveCities(options?: { page?: number; limit?: number } & DestinationQueryOptions) {
    return this.repository.findAllActiveCities(options)
  }

  async getCity(slug: string, options?: DestinationQueryOptions) {
    return this.repository.findCityBySlug(slug, options)
  }

  async getCityById(cityId: number, options?: DestinationQueryOptions) {
    return this.repository.findCityById(cityId, options)
  }

  async getCitiesByIds(cityIds: number[], options?: DestinationQueryOptions) {
    return this.repository.findCitiesByIds(cityIds, options)
  }

  async getCountryById(countryId: number, options?: DestinationQueryOptions) {
    return this.repository.findCountryById(countryId, options)
  }

  async getExperiencesByCity(cityId: number, options?: DestinationQueryOptions) {

    return this.repository.findExperiencesByCity(cityId, options)
  }

  async searchExperiences(cityId?: number | string, options?: DestinationQueryOptions) {
    if (cityId) {
      return this.repository.findExperiencesByCity(Number(cityId), options)
    }
    return this.repository.findFeaturedExperiences(options?.limit || 10, options)
  }

  async getFeaturedExperiences(options?: DestinationQueryOptions) {
    return this.repository.findFeaturedExperiences(options?.limit || 6, options)
  }

  async getHomePageOverview(options?: DestinationQueryOptions | string) {
    const opts: DestinationQueryOptions = typeof options === 'string' ? { currency: options } : options || {}
    const expDocs = await this.getFeaturedExperiences(opts)
    const countriesRes = await this.getCountries(opts)

    return {
      featuredExperiences: expDocs,
      topCountries: countriesRes.docs || [],
    }
  }

  async getCanonicalCity(query: string) {
    return this.repository.findCanonicalCity(query)
  }
}

