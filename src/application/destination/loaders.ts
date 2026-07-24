import { getDomainServices } from '@/domains/factory'
import type { DestinationQueryOptions } from '@/domains/destination/types'
import type { DestinationsCatalogDTO, CountryDetailsDTO, CityExperiencesDTO } from './dto'

export class DestinationsCatalogLoader {
  static async load(options?: DestinationQueryOptions): Promise<DestinationsCatalogDTO> {
    try {
      const { destination, localization } = await getDomainServices()
      const ctx = localization.buildContext({
        language: (options?.locale || 'en') as any,
        currency: (options?.currency || 'EGP') as any,
      })

      const countriesRes = await destination.getCountries(options)
      const countries = await Promise.all(
        (countriesRes.docs || []).map(async (doc: Record<string, any>) => {
          const rawName = String(doc.name || '')
          const rawDescription = typeof doc.description === 'string' ? doc.description : ''

          return {
            id: Number(doc.id),
            name: await localization.translateText(rawName, ctx),
            slug: doc.slug || '',
            description: await localization.translateText(rawDescription, ctx),
            bannerUrl: doc.bannerImage?.url || '/images/hero-bg.jpg',
            citiesCount: Array.isArray(doc.cities) ? doc.cities.length : 0,
            experiencesCount: doc.experiencesCount || 0,
          }
        }),
      )

      return { countries, featuredCities: [] }
    } catch (err: unknown) {
      console.error('[DestinationsCatalogLoader] Error loading catalog:', err)
      return { countries: [], featuredCities: [] }
    }
  }
}

export class CountryLoader {
  static async loadBySlug(countrySlug: string, options?: DestinationQueryOptions): Promise<CountryDetailsDTO | null> {
    try {
      const { destination, localization } = await getDomainServices()
      const ctx = localization.buildContext({
        language: (options?.locale || 'en') as any,
        currency: (options?.currency || 'EGP') as any,
      })

      const countryDoc = (await destination.getCountry(countrySlug, options)) as Record<string, any> | null
      if (!countryDoc) return null

      const rawCountryName = String(countryDoc.name || '')
      const rawCountryDesc = typeof countryDoc.description === 'string' ? countryDoc.description : ''

      const translatedCountryName = await localization.translateText(rawCountryName, ctx)
      const translatedCountryDesc = await localization.translateText(rawCountryDesc, ctx)

      const citiesRes = await destination.getCitiesByCountry(Number(countryDoc.id), options)

      const country = {
        id: Number(countryDoc.id),
        name: translatedCountryName,
        slug: countryDoc.slug || '',
        description: translatedCountryDesc,
        bannerUrl: countryDoc.bannerImage?.url || '/images/hero-bg.jpg',
        citiesCount: citiesRes.totalDocs || 0,
        experiencesCount: countryDoc.experiencesCount || 0,
      }

      const cities = await Promise.all(
        (citiesRes.docs || []).map(async (doc: Record<string, any>) => {
          const rawCityName = String(doc.name || '')
          const rawCityDesc = typeof doc.description === 'string' ? doc.description : ''

          return {
            id: Number(doc.id),
            name: await localization.translateText(rawCityName, ctx),
            slug: doc.slug || '',
            countryName: country.name,
            countrySlug: country.slug,
            description: await localization.translateText(rawCityDesc, ctx),
            bannerUrl: doc.bannerImage?.url || '/images/cairo.jpg',
            experiencesCount: doc.experiencesCount || 0,
          }
        }),
      )

      return { country, cities }
    } catch (err: unknown) {
      console.error('[CountryLoader.loadBySlug] Error loading country details:', err)
      return null
    }
  }
}

export class CityLoader {
  static async loadBySlugs(
    countrySlug: string,
    citySlug: string,
    options?: DestinationQueryOptions,
  ): Promise<CityExperiencesDTO | null> {
    try {
      const { destination, localization } = await getDomainServices()
      const ctx = localization.buildContext({
        language: (options?.locale || 'en') as any,
        currency: (options?.currency || 'EGP') as any,
      })

      const cityDoc = (await destination.getCity(citySlug, options)) as Record<string, any> | null
      if (!cityDoc) return null

      const countryDoc = (await destination.getCountry(countrySlug, options)) as Record<string, any> | null
      const experiencesRes = await destination.getExperiencesByCity(Number(cityDoc.id), options)

      const rawCityName = String(cityDoc.name || '')
      const rawCityDesc = typeof cityDoc.description === 'string' ? cityDoc.description : ''
      const rawCountryName = String(countryDoc?.name || '')
      const rawCountryDesc = typeof countryDoc?.description === 'string' ? countryDoc.description : ''

      const translatedCityName = await localization.translateText(rawCityName, ctx)
      const translatedCityDesc = await localization.translateText(rawCityDesc, ctx)
      const translatedCountryName = await localization.translateText(rawCountryName, ctx)
      const translatedCountryDesc = await localization.translateText(rawCountryDesc, ctx)

      const city = {
        id: Number(cityDoc.id),
        name: translatedCityName,
        slug: cityDoc.slug || '',
        countryName: translatedCountryName,
        countrySlug: countryDoc?.slug || '',
        description: translatedCityDesc,
        bannerUrl: cityDoc.bannerImage?.url || '/images/cairo.jpg',
        experiencesCount: experiencesRes.totalDocs || 0,
      }

      const country = {
        id: Number(countryDoc?.id || 1),
        name: translatedCountryName,
        slug: countryDoc?.slug || '',
        description: translatedCountryDesc,
        bannerUrl: countryDoc?.bannerImage?.url || '/images/hero-bg.jpg',
        citiesCount: 1,
        experiencesCount: experiencesRes.totalDocs || 0,
      }

      const experiences = await Promise.all(
        (experiencesRes.docs || []).map(async (doc: Record<string, any>) => {
          const rawTitle = String(doc.title || '')
          const rawSubtitle = String(doc.subtitle || '')
          const rawPriceEGP = doc.basePriceEGP || 0
          const pricingResult = await localization.formatPrice(rawPriceEGP, ctx)

          return {
            id: Number(doc.id),
            slug: doc.slug || `exp-${doc.id}`,
            title: await localization.translateText(rawTitle, ctx),
            subtitle: await localization.translateText(rawSubtitle, ctx),
            type: (doc.type || 'package') as 'package' | 'daily_tour',
            imageUrl: doc.featuredImage?.url || '/images/hero-bg.jpg',
            location: `${city.name}, ${country.name}`,
            durationDays: doc.durationDays || 1,
            rating: doc.rating || 5.0,
            reviewsCount: doc.reviewsCount || 0,
            price: {
              amountEGP: rawPriceEGP,
              displayAmount: pricingResult.displayAmount,
              displayCurrency: pricingResult.displayCurrency,
              formatted: pricingResult.formatted,
            },
          }
        }),
      )

      return { city, country, experiences }
    } catch (err: unknown) {
      console.error('[CityLoader.loadBySlugs] Error loading city details:', err)
      return null
    }
  }
}
