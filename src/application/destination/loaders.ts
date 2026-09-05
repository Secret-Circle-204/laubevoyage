import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { DestinationQueryOptions } from '@/domains/destination/types'
import type { DestinationsCatalogDTO, CountryDetailsDTO, CityExperiencesDTO } from './dto'
import { serializeLexicalToText } from '@/lib/lexical'

export class DestinationsCatalogLoader {
  static async load(
    options?: DestinationQueryOptions & { page?: number; limit?: number },
  ): Promise<DestinationsCatalogDTO> {
    const { destination, localization } = await getDomainServices()
    const ctx = await localization.buildContext({
      cookieLocale: options?.locale,
      cookieCurrency: options?.currency,
    })

    const page = options?.page || 1
    const limit = options?.limit || 12

    // Query 1: Active Operating Countries (Finite Reference Catalog: < 10 countries)
    const countriesRes = await destination.getCountries(options)
    const countryDocs = (countriesRes.docs || []) as Record<string, any>[]
    const countryIds = countryDocs.map((c) => Number(c.id)).filter(Boolean)

    // Query 2: Single Database SQL Count Aggregation (GROUP BY country_id) in 1 query
    const cityCountsMap = await destination.getCitiesCountGroupedByCountry(countryIds)

    // Query 3: Server-Side Paginated Cities Query (Demand-Driven Retrieval: 12 cities per page)
    const citiesRes = await destination.getAllActiveCities({
      page,
      limit,
      ...options,
    })
    const cityDocs = (citiesRes.docs || []) as Record<string, any>[]

    const rawTexts: string[] = []

    for (const countryDoc of countryDocs) {
      rawTexts.push(String(countryDoc.name || ''))
      rawTexts.push(serializeLexicalToText(countryDoc.description))
    }

    for (const cityDoc of cityDocs) {
      rawTexts.push(String(cityDoc.name || ''))
      rawTexts.push(serializeLexicalToText(cityDoc.description))
      const cObj = cityDoc.country
      const cName = cObj && typeof cObj === 'object' && 'name' in cObj ? String(cObj.name) : ''
      rawTexts.push(cName)
    }

    // Single Batch Translation Request for overview presentation
    const translatedTexts = await localization.translateBatch(rawTexts, ctx)
    let textIdx = 0

    const countries = countryDocs.map((countryDoc) => {
      const countryId = Number(countryDoc.id)
      const countrySlug = countryDoc.slug || ''
      const translatedCountryName = translatedTexts[textIdx++] || String(countryDoc.name || '')
      const translatedCountryDesc = translatedTexts[textIdx++] || ''

      const countryBannerUrl =
        countryDoc.hero && typeof countryDoc.hero === 'object' && countryDoc.hero.url
          ? countryDoc.hero.url
          : typeof countryDoc.hero === 'string'
          ? countryDoc.hero
          : ''

      return {
        id: countryId,
        name: translatedCountryName,
        slug: countrySlug,
        description: translatedCountryDesc,
        bannerUrl: countryBannerUrl,
        citiesCount: cityCountsMap.get(countryId) || 0,
        experiencesCount: countryDoc.experiencesCount || 0,
      }
    })

    const cities = cityDocs.map((cityDoc) => {
      const translatedCityName = translatedTexts[textIdx++] || String(cityDoc.name || '')
      const translatedCityDesc = translatedTexts[textIdx++] || ''
      const countryObj = cityDoc.country
      const defaultCountryName = countryObj && typeof countryObj === 'object' && 'name' in countryObj ? String(countryObj.name) : ''
      const countrySlug = countryObj && typeof countryObj === 'object' && 'slug' in countryObj ? String(countryObj.slug) : ''
      const translatedCountryName = translatedTexts[textIdx++] || defaultCountryName

      const cityBannerUrl =
        cityDoc.hero && typeof cityDoc.hero === 'object' && cityDoc.hero.url
          ? cityDoc.hero.url
          : typeof cityDoc.hero === 'string'
          ? cityDoc.hero
          : ''

      return {
        id: Number(cityDoc.id),
        name: translatedCityName,
        slug: cityDoc.slug || '',
        countryName: translatedCountryName,
        countrySlug,
        description: translatedCityDesc,
        bannerUrl: cityBannerUrl,
        experiencesCount: cityDoc.experiencesCount || 0,
      }
    })

    return {
      countries,
      cities,
      pagination: {
        page: citiesRes.page || page,
        limit: citiesRes.limit || limit,
        totalDocs: citiesRes.totalDocs || 0,
        totalPages: citiesRes.totalPages || 1,
        hasNextPage: Boolean(citiesRes.hasNextPage),
        hasPrevPage: Boolean(citiesRes.hasPrevPage),
      },
    }
  }
}



export class CountryLoader {
  static async loadBySlug(
    countrySlug: string,
    options?: DestinationQueryOptions & { page?: number; limit?: number },
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

    const page = options?.page || 1
    const limit = options?.limit || 12

    const citiesRes = await destination.getCitiesByCountry(Number(countryDoc.id), {
      page,
      limit,
      ...options,
    })

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

    const countryBannerUrl =
      countryDoc.hero && typeof countryDoc.hero === 'object' && countryDoc.hero.url
        ? countryDoc.hero.url
        : typeof countryDoc.hero === 'string'
        ? countryDoc.hero
        : ''

    const country = {
      id: Number(countryDoc.id),
      name: translatedCountryName,
      slug: countryDoc.slug || '',
      description: translatedCountryDesc,
      bannerUrl: countryBannerUrl,
      citiesCount: citiesRes.totalDocs || citiesRes.docs?.length || 0,
      experiencesCount: countryDoc.experiencesCount || 0,
    }

    const cities = (citiesRes.docs || []).map((doc: Record<string, any>) => {
      const translatedCityName = translated[idx++] || String(doc.name || '')
      const translatedCityDesc = translated[idx++] || ''

      const cityBannerUrl =
        doc.hero && typeof doc.hero === 'object' && doc.hero.url
          ? doc.hero.url
          : typeof doc.hero === 'string'
          ? doc.hero
          : ''

      return {
        id: Number(doc.id),
        name: translatedCityName,
        slug: doc.slug || '',
        countryName: country.name,
        countrySlug: country.slug,
        description: translatedCityDesc,
        bannerUrl: cityBannerUrl,
        experiencesCount: doc.experiencesCount || 0,
      }
    })

    return {
      country,
      cities,
      pagination: {
        page: citiesRes.page || page,
        limit: citiesRes.limit || limit,
        totalDocs: citiesRes.totalDocs,
        totalPages: citiesRes.totalPages || 1,
        hasNextPage: citiesRes.hasNextPage || false,
        hasPrevPage: citiesRes.hasPrevPage || false,
      },
    }
  }
}

export class CityLoader {
  static async loadBySlugs(
    countrySlug: string,
    citySlug: string,
    options?: DestinationQueryOptions & { page?: number; limit?: number },
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
    if (!countryDoc) return null

    const page = options?.page || 1
    const limit = options?.limit || 12

    const experiencesRes = await destination.getExperiencesByCity(Number(cityDoc.id), {
      page,
      limit,
      ...options,
    })

    // Collect all texts for 1 Single Batch Request
    const rawTexts: string[] = [
      String(cityDoc.name || ''),
      serializeLexicalToText(cityDoc.description),
      String(countryDoc.name || ''),
      serializeLexicalToText(countryDoc.description),
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
    const translatedCountryName = translated[idx++] || String(countryDoc.name || '')
    const translatedCountryDesc = translated[idx++] || ''

    const cityBannerUrl =
      cityDoc.hero && typeof cityDoc.hero === 'object' && cityDoc.hero.url
        ? cityDoc.hero.url
        : typeof cityDoc.hero === 'string'
        ? cityDoc.hero
        : ''

    const city = {
      id: Number(cityDoc.id),
      name: translatedCityName,
      slug: cityDoc.slug || '',
      countryName: translatedCountryName,
      countrySlug: countryDoc.slug || '',
      description: translatedCityDesc,
      bannerUrl: cityBannerUrl,
      experiencesCount: experiencesRes.totalDocs || 0,
    }

    const countryBannerUrl =
      countryDoc.hero && typeof countryDoc.hero === 'object' && countryDoc.hero.url
        ? countryDoc.hero.url
        : typeof countryDoc.hero === 'string'
        ? countryDoc.hero
        : ''

    const country = {
      id: Number(countryDoc.id),
      name: translatedCountryName,
      slug: countryDoc.slug || '',
      description: translatedCountryDesc,
      bannerUrl: countryBannerUrl,
      citiesCount: 1,
      experiencesCount: experiencesRes.totalDocs || 0,
    }

    const cityExpIds: number[] = (experiencesRes.docs || [])
      .map((doc: any) => Number(doc.id))
      .filter((id: number): id is number => typeof id === 'number' && id > 0)
    const cityAggregates =
      cityExpIds.length > 0 ? await experience.getManyByIds(cityExpIds) : []
    const cityExpMap = new Map(cityAggregates.map((e) => [e.id, e]))

    const experiences = await Promise.all(
      (experiencesRes.docs || []).map(async (doc: Record<string, any>) => {
        const translatedTitle = translated[idx++] || String(doc.title || '')
        const translatedSubtitle = translated[idx++] || String(doc.subtitle || '')
        const todayStr = getBusinessDateString(ctx.timezone)
        const expEntity = cityExpMap.get(Number(doc.id))
        const basePriceEGP = expEntity
          ? await experience.resolveStartingPrice(expEntity, todayStr)
          : await experience.resolveStartingPrice(Number(doc.id), todayStr)
        const pricingResult = await localization.formatPrice(basePriceEGP, ctx)

        const expHeroUrl =
          doc.hero && typeof doc.hero === 'object' && doc.hero.url
            ? doc.hero.url
            : typeof doc.hero === 'string'
            ? doc.hero
            : ''

        const durationDaysRaw =
          doc.duration && typeof doc.duration === 'object' && doc.duration.days !== undefined
            ? doc.duration.days
            : doc.durationDays
        const durationDays =
          typeof durationDaysRaw === 'number' && durationDaysRaw >= 1
            ? durationDaysRaw
            : Number(durationDaysRaw) || 1

        return {
          id: Number(doc.id),
          slug: doc.slug || `exp-${doc.id}`,
          title: translatedTitle,
          subtitle: translatedSubtitle,
          type: (doc.type || 'package') as 'package' | 'daily_tour',
          imageUrl: expHeroUrl,
          location: `${city.name}, ${country.name}`,
          durationDays,
          rating: typeof doc.rating === 'number' ? doc.rating : 0,
          reviewsCount: typeof doc.reviewsCount === 'number' ? doc.reviewsCount : 0,
          price: pricingResult,
        }
      }),
    )

    return {
      city,
      country,
      experiences,
      pagination: {
        page: experiencesRes.page || page,
        limit: experiencesRes.limit || limit,
        totalDocs: experiencesRes.totalDocs,
        totalPages: experiencesRes.totalPages || 1,
        hasNextPage: experiencesRes.hasNextPage || false,
        hasPrevPage: experiencesRes.hasPrevPage || false,
      },
    }
  }
}
