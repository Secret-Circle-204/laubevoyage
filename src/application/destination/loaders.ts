// src/application/destination/loaders.ts
import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
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

      // Collect raw texts for 1 Single Batch Request
      const rawTexts: string[] = []

      for (const doc of countriesRes.docs || []) {
        const item = doc as Record<string, any>
        rawTexts.push(String(item.name || ''))
        rawTexts.push(typeof item.description === 'string' ? item.description : '')

        const citiesRes = await destination.getCitiesByCountry(Number(item.id), options)
        for (const cityDoc of citiesRes.docs || []) {
          const c = cityDoc as Record<string, any>
          rawTexts.push(String(c.name || ''))
          rawTexts.push(typeof c.description === 'string' ? c.description : '')
        }
      }

      // Single Batch Translation Request for entire destinations catalog
      const translatedTexts = await localization.translateBatch(rawTexts, ctx)
      let textIdx = 0

      const allCities: Array<{
        id: number
        name: string
        slug: string
        countryName: string
        countrySlug: string
        description: string
        bannerUrl: string
        experiencesCount: number
      }> = []

      const countries = await Promise.all(
        (countriesRes.docs || []).map(async (doc: Record<string, any>) => {
          const countryId = Number(doc.id)
          const countrySlug = doc.slug || ''
          const translatedCountryName = translatedTexts[textIdx++] || String(doc.name || '')
          const translatedCountryDesc = translatedTexts[textIdx++] || ''

          const citiesRes = await destination.getCitiesByCountry(countryId, options)
          const translatedCities = (citiesRes.docs || []).map((cityDoc: Record<string, any>) => {
            const translatedCityName = translatedTexts[textIdx++] || String(cityDoc.name || '')
            const translatedCityDesc = translatedTexts[textIdx++] || ''

            return {
              id: Number(cityDoc.id),
              name: translatedCityName,
              slug: cityDoc.slug || '',
              countryName: translatedCountryName,
              countrySlug,
              description: translatedCityDesc,
              bannerUrl: cityDoc.bannerImage?.url || '/images/hero-bg.jpg',
              experiencesCount: cityDoc.experiencesCount || 0,
            }
          })

          allCities.push(...translatedCities)

          return {
            id: countryId,
            name: translatedCountryName,
            slug: countrySlug,
            description: translatedCountryDesc,
            bannerUrl: doc.bannerImage?.url || '/images/hero-bg.jpg',
            citiesCount: citiesRes.totalDocs || (Array.isArray(doc.cities) ? doc.cities.length : 0),
            experiencesCount: doc.experiencesCount || 0,
          }
        }),
      )

      return { countries, featuredCities: allCities }
    } catch (err: unknown) {
      console.error('[DestinationsCatalogLoader] Error loading catalog:', err)
      return { countries: [], featuredCities: [] }
    }
  }
}

export class CountryLoader {
  static async loadBySlug(
    countrySlug: string,
    options?: DestinationQueryOptions,
  ): Promise<CountryDetailsDTO | null> {
    try {
      const { destination, localization } = await getDomainServices()
      const ctx = localization.buildContext({
        language: (options?.locale || 'en') as any,
        currency: (options?.currency || 'EGP') as any,
      })

      const countryDoc = (await destination.getCountry(countrySlug, options)) as Record<
        string,
        any
      > | null
      if (!countryDoc) return null

      const citiesRes = await destination.getCitiesByCountry(Number(countryDoc.id), options)

      // Collect all texts for 1 Single Batch Request
      const rawTexts: string[] = [
        String(countryDoc.name || ''),
        typeof countryDoc.description === 'string' ? countryDoc.description : '',
      ]

      for (const cDoc of citiesRes.docs || []) {
        const c = cDoc as Record<string, any>
        rawTexts.push(String(c.name || ''))
        rawTexts.push(typeof c.description === 'string' ? c.description : '')
      }

      const translated = await localization.translateBatch(rawTexts, ctx)
      let idx = 0

      const translatedCountryName = translated[idx++] || String(countryDoc.name || '')
      const translatedCountryDesc = translated[idx++] || ''

      const country = {
        id: Number(countryDoc.id),
        name: translatedCountryName,
        slug: countryDoc.slug || '',
        description: translatedCountryDesc,
        bannerUrl: countryDoc.bannerImage?.url || '/images/hero-bg.jpg',
        citiesCount: citiesRes.totalDocs || 0,
        experiencesCount: countryDoc.experiencesCount || 0,
      }

      const cities = (citiesRes.docs || []).map((doc: Record<string, any>) => {
        const translatedCityName = translated[idx++] || String(doc.name || '')
        const translatedCityDesc = translated[idx++] || ''

        return {
          id: Number(doc.id),
          name: translatedCityName,
          slug: doc.slug || '',
          countryName: country.name,
          countrySlug: country.slug,
          description: translatedCityDesc,
          bannerUrl: doc.bannerImage?.url || '/images/cairo.jpg',
          experiencesCount: doc.experiencesCount || 0,
        }
      })

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
      const { destination, localization, experience } = await getDomainServices()
      const ctx = localization.buildContext({
        language: (options?.locale || 'en') as any,
        currency: (options?.currency || 'EGP') as any,
      })

      const cityDoc = (await destination.getCity(citySlug, options)) as Record<string, any> | null
      if (!cityDoc) return null

      const countryDoc = (await destination.getCountry(countrySlug, options)) as Record<
        string,
        any
      > | null
      const experiencesRes = await destination.getExperiencesByCity(Number(cityDoc.id), options)

      // Collect all texts for 1 Single Batch Request
      const rawTexts: string[] = [
        String(cityDoc.name || ''),
        typeof cityDoc.description === 'string' ? cityDoc.description : '',
        String(countryDoc?.name || ''),
        typeof countryDoc?.description === 'string' ? countryDoc.description : '',
      ]

      for (const expDoc of experiencesRes.docs || []) {
        const e = expDoc as Record<string, any>
        rawTexts.push(String(e.title || ''))
        rawTexts.push(String(e.subtitle || ''))
      }

      const translated = await localization.translateBatch(rawTexts, ctx)
      let idx = 0

      const translatedCityName = translated[idx++] || String(cityDoc.name || '')
      const translatedCityDesc = translated[idx++] || ''
      const translatedCountryName = translated[idx++] || String(countryDoc?.name || '')
      const translatedCountryDesc = translated[idx++] || ''

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
          const translatedTitle = translated[idx++] || String(doc.title || '')
          const translatedSubtitle = translated[idx++] || String(doc.subtitle || '')
          const todayStr = getBusinessDateString(ctx.timezone)
          const basePriceEGP = await experience.resolveStartingPrice(Number(doc.id), todayStr)
          const pricingResult = await localization.formatPrice(basePriceEGP, ctx)

          return {
            id: Number(doc.id),
            slug: doc.slug || `exp-${doc.id}`,
            title: translatedTitle,
            subtitle: translatedSubtitle,
            type: (doc.type || 'package') as 'package' | 'daily_tour',
            imageUrl: doc.featuredImage?.url || '/images/hero-bg.jpg',
            location: `${city.name}, ${country.name}`,
            durationDays: doc.durationDays || 1,
            rating: doc.rating || 5.0,
            reviewsCount: doc.reviewsCount || 0,
            price: pricingResult,
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
