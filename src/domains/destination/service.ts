import { DestinationRepository } from './repository'

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

  async getCountries() {
    return this.repository.findCountries()
  }

  async getCountry(slug: string) {
    return this.repository.findCountryBySlug(slug)
  }

  async getCitiesByCountry(countryId: number) {
    return this.repository.findCitiesByCountry(countryId)
  }

  async getCity(slug: string) {
    return this.repository.findCityBySlug(slug)
  }

  async getExperiencesByCity(cityId: number, options: { page?: number; limit?: number; type?: string } = {}) {
    return this.repository.findExperiencesByCity(cityId, options)
  }

  async searchExperiences(cityId?: number | string, options: { page?: number; limit?: number; type?: string } = {}) {
    if (cityId) {
      return this.repository.findExperiencesByCity(Number(cityId), options)
    }
    return this.repository.findFeaturedExperiences(options.limit || 10)
  }

  async getFeaturedExperiences(options: { limit?: number } = {}) {
    return this.repository.findFeaturedExperiences(options.limit)
  }

  async getHomePageOverview(currency: string = 'EGP') {
    const expDocs = await this.getFeaturedExperiences({ limit: 6 })
    const countriesRes = await this.getCountries()

    return {
      featuredExperiences: expDocs,
      topCountries: countriesRes.docs || [],
    }
  }
}
