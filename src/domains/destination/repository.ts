import type { Payload } from 'payload'

export class DestinationRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findCountries() {
    return this.payload.find({
      collection: 'countries',
      where: {
        isActive: { equals: true },
      },
      sort: 'name',
    })
  }

  async findCountryBySlug(slug: string) {
    const result = await this.payload.find({
      collection: 'countries',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
    })

    return result.docs[0] || null
  }

  async findCitiesByCountry(countryId: number) {
    return this.payload.find({
      collection: 'cities',
      where: {
        and: [{ country: { equals: countryId } }, { isActive: { equals: true } }],
      },
      sort: 'name',
    })
  }

  async findCityBySlug(slug: string) {
    const result = await this.payload.find({
      collection: 'cities',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
    })

    return result.docs[0] || null
  }

  async findExperiencesByCity(cityId: number, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = options

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

  async findFeaturedExperiences(limit: number = 6) {
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
