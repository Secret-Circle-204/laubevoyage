// src/application/destination/loaders.ts
import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { DestinationQueryOptions } from '@/domains/destination/types'
import type { DestinationsCatalogDTO, CountryDetailsDTO, CityExperiencesDTO } from './dto'
import { serializeLexicalToText } from '@/lib/lexical'

export class DestinationsCatalogLoader {
  static async load(options?: DestinationQueryOptions): Promise<DestinationsCatalogDTO> {
    const { destination, localization } = await getDomainServices()
    const ctx = await localization.buildContext({
      cookieLocale: options?.locale,
      cookieCurrency: options?.currency,
    })

    const countriesRes = await destination.getCountries(options)

    // Fetch country and city documents sequentially to guarantee deterministic ordering
    const countryRecords: Array<{
      countryDoc: Record<string, any>
      cityDocs: Array<Record<string, any>>
    }> = []

    const rawTexts: string[] = []

    for (const countryDoc of (countriesRes.docs || []) as Record<string, any>[]) {
      const countryId = Number(countryDoc.id)
      rawTexts.push(String(countryDoc.name || ''))
      rawTexts.push(serializeLexicalToText(countryDoc.description))

      const citiesRes = await destination.getCitiesByCountry(countryId, options)
      const cityDocs = (citiesRes.docs || []) as Record<string, any>[]

      for (const cityDoc of cityDocs) {
        rawTexts.push(String(cityDoc.name || ''))
        rawTexts.push(serializeLexicalToText(cityDoc.description))
      }

      countryRecords.push({ countryDoc, cityDocs })
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

    const countries = countryRecords.map(({ countryDoc, cityDocs }) => {
      const countryId = Number(countryDoc.id)
      const countrySlug = countryDoc.slug || ''
      const translatedCountryName = translatedTexts[textIdx++] || String(countryDoc.name || '')
      const translatedCountryDesc = translatedTexts[textIdx++] || ''

      const translatedCities = cityDocs.map((cityDoc) => {
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
        bannerUrl: countryDoc.bannerImage?.url || '/images/hero-bg.jpg',
        citiesCount: cityDocs.length,
        experiencesCount: countryDoc.experiencesCount || 0,
      }
    })

    return { countries, featuredCities: allCities }
  }
}

export class CountryLoader {
  static async loadBySlug(
    countrySlug: string,
    options?: DestinationQueryOptions,
  ): Promise<CountryDetailsDTO | null> {
    const { destination, localization } = await getDomainServices()
    const ctx = await localization.buildContext({
      cookieLocale: options?.locale,
      cookieCurrency: options?.currency,
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
      serializeLexicalToText(countryDoc.description),
    ]

    for (const cDoc of citiesRes.docs || []) {
      const c = cDoc as Record<string, any>
      rawTexts.push(String(c.name || ''))
      rawTexts.push(serializeLexicalToText(c.description))
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
  }
}

export class CityLoader {
  static async loadBySlugs(
    countrySlug: string,
    citySlug: string,
    options?: DestinationQueryOptions,
  ): Promise<CityExperiencesDTO | null> {
    const { destination, localization, experience } = await getDomainServices()
    const ctx = await localization.buildContext({
      cookieLocale: options?.locale,
      cookieCurrency: options?.currency,
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
      serializeLexicalToText(cityDoc.description),
      String(countryDoc?.name || ''),
      serializeLexicalToText(countryDoc?.description),
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
  }
}
