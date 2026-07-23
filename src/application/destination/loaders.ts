import { getDomainServices } from '@/domains/factory'
import type { DestinationsCatalogDTO, CountryDetailsDTO, CityExperiencesDTO } from './dto'

export class DestinationsCatalogLoader {
  static async load(): Promise<DestinationsCatalogDTO> {
    try {
      const { destination } = await getDomainServices()
      const countriesRes = await destination.getCountries()
      const countries = (countriesRes.docs || []).map((doc: any) => ({
        id: Number(doc.id),
        name: doc.name || '',
        slug: doc.slug || '',
        description: typeof doc.description === 'string' ? doc.description : '',
        bannerUrl: doc.bannerImage?.url || '/images/hero-bg.jpg',
        citiesCount: Array.isArray(doc.cities) ? doc.cities.length : 0,
        experiencesCount: doc.experiencesCount || 0,
      }))

      return { countries, featuredCities: [] }
    } catch {
      return { countries: [], featuredCities: [] }
    }
  }
}

export class CountryLoader {
  static async loadBySlug(countrySlug: string): Promise<CountryDetailsDTO | null> {
    try {
      const { destination } = await getDomainServices()
      const countryDoc = (await destination.getCountry(countrySlug)) as any
      if (!countryDoc) return null

      const citiesRes = await destination.getCitiesByCountry(Number(countryDoc.id))

      const country = {
        id: Number(countryDoc.id),
        name: countryDoc.name || '',
        slug: countryDoc.slug || '',
        description: typeof countryDoc.description === 'string' ? countryDoc.description : '',
        bannerUrl: countryDoc.bannerImage?.url || '/images/hero-bg.jpg',
        citiesCount: citiesRes.totalDocs || 0,
        experiencesCount: countryDoc.experiencesCount || 0,
      }

      const cities = (citiesRes.docs || []).map((doc: any) => ({
        id: Number(doc.id),
        name: doc.name || '',
        slug: doc.slug || '',
        countryName: country.name,
        countrySlug: country.slug,
        description: typeof doc.description === 'string' ? doc.description : '',
        bannerUrl: doc.bannerImage?.url || '/images/cairo.jpg',
        experiencesCount: doc.experiencesCount || 0,
      }))

      return { country, cities }
    } catch {
      return null
    }
  }
}

export class CityLoader {
  static async loadBySlugs(countrySlug: string, citySlug: string): Promise<CityExperiencesDTO | null> {
    try {
      const { destination } = await getDomainServices()
      const cityDoc = (await destination.getCity(citySlug)) as any
      if (!cityDoc) return null

      const countryDoc = (await destination.getCountry(countrySlug)) as any
      const experiencesRes = await destination.getExperiencesByCity(Number(cityDoc.id))

      const city = {
        id: Number(cityDoc.id),
        name: cityDoc.name || '',
        slug: cityDoc.slug || '',
        countryName: countryDoc?.name || '',
        countrySlug: countryDoc?.slug || '',
        description: typeof cityDoc.description === 'string' ? cityDoc.description : '',
        bannerUrl: cityDoc.bannerImage?.url || '/images/cairo.jpg',
        experiencesCount: experiencesRes.totalDocs || 0,
      }

      const country = {
        id: Number(countryDoc?.id || 1),
        name: countryDoc?.name || '',
        slug: countryDoc?.slug || '',
        description: typeof countryDoc?.description === 'string' ? countryDoc.description : '',
        bannerUrl: countryDoc?.bannerImage?.url || '/images/hero-bg.jpg',
        citiesCount: 1,
        experiencesCount: experiencesRes.totalDocs || 0,
      }

      const experiences = (experiencesRes.docs || []).map((doc: any) => ({
        id: Number(doc.id),
        slug: doc.slug || `exp-${doc.id}`,
        title: doc.title || '',
        subtitle: doc.subtitle || '',
        type: (doc.type || 'package') as 'package' | 'daily_tour',
        imageUrl: doc.featuredImage?.url || '/images/hero-bg.jpg',
        location: `${city.name}, ${country.name}`,
        durationDays: doc.durationDays || 1,
        rating: doc.rating || 5.0,
        reviewsCount: doc.reviewsCount || 0,
        price: {
          amountEGP: doc.basePriceEGP || 0,
          displayAmount: doc.basePriceEGP || 0,
          displayCurrency: 'EGP',
        },
      }))

      return { city, country, experiences }
    } catch {
      return null
    }
  }
}
