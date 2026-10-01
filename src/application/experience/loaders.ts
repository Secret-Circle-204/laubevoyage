import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import type { LocaleContext } from '@/types/locale'
import type { ConvertedPrice } from '@/domains/currency/types'
import type { ParsedExperienceSearchParams } from '../shared/parsers/experience-search-parser'
import type { ExperienceCatalogDTO, BudgetPresetsDTO, BudgetPresetOption } from './dto'

export const DISCOVERY_BUDGET_MIN_ANCHORS_EGP = [500, 1000, 2000, 2500, 5000, 15000] as const
export const DISCOVERY_BUDGET_MAX_ANCHORS_EGP = [20000, 30000, 40000, 50000, 70000] as const

export class ExperiencesCatalogLoader {
  /**
   * Resolves canonical search budget presets into localized display labels
   * using the authoritative localization.formatPrice service.
   */
  static async resolveBudgetPresets(
    ctx: LocaleContext,
    localization: { formatPrice: (amount: number, ctx: LocaleContext) => Promise<ConvertedPrice> },
  ): Promise<BudgetPresetsDTO> {
    const isEgp = ctx.currency.toUpperCase() === 'EGP'

    let currencyCode = 'EGP'
    let currencySymbol = 'EGP'

    const minPresets: BudgetPresetOption[] = []
    for (let i = 0; i < DISCOVERY_BUDGET_MIN_ANCHORS_EGP.length; i++) {
      const anchor = DISCOVERY_BUDGET_MIN_ANCHORS_EGP[i]
      const converted = await localization.formatPrice(anchor, ctx)
      currencyCode = converted.currencyCode
      currencySymbol = converted.currencySymbol

      const displayLabel = isEgp
        ? anchor < 1000
          ? `${anchor}`
          : `${anchor / 1000}K+`
        : `${converted.formatted}+`

      minPresets.push({ egpValue: anchor, displayLabel })
    }

    const maxPresets: BudgetPresetOption[] = []
    for (let i = 0; i < DISCOVERY_BUDGET_MAX_ANCHORS_EGP.length; i++) {
      const anchor = DISCOVERY_BUDGET_MAX_ANCHORS_EGP[i]
      const converted = await localization.formatPrice(anchor, ctx)
      currencyCode = converted.currencyCode
      currencySymbol = converted.currencySymbol

      const displayLabel = isEgp ? `Up to ${anchor / 1000}K` : `Up to ${converted.formatted}`

      maxPresets.push({ egpValue: anchor, displayLabel })
    }

    return {
      currencyCode,
      currencySymbol,
      minPresets,
      maxPresets,
    }
  }

  static async load(
    filters: ParsedExperienceSearchParams,
    options?: { locale?: string; currency?: string },
  ): Promise<ExperienceCatalogDTO> {
    const page = filters.page || 1
    const limit = 12

    try {
      const { experience, localization, destination } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: options?.locale,
        cookieCurrency: options?.currency,
      })

      const budgetPresets = await ExperiencesCatalogLoader.resolveBudgetPresets(ctx, localization)

      const catalog = await experience.getCatalog({
        keyword: filters.query,
        countryId: filters.countryId,
        cityId: filters.cityId,
        minPriceEGP: filters.minPrice,
        maxPriceEGP: filters.maxPrice,
        minDurationDays: filters.duration,
        departureDate: filters.date,
        type: filters.type,
        page,
        limit,
      })

      // Demand-driven destination resolution for displayed experiences + bounded search bar
      const expCityIds = Array.from(
        new Set(
          (catalog.experiences || [])
            .map((e: any) => Number(e.cityId))
            .filter((id: number) => id > 0)
        )
      )

      const initialCitiesPromise = filters.countryId
        ? destination.getCitiesByCountry(filters.countryId, { page: 1, limit: 20 })
        : destination.getAllActiveCities({ page: 1, limit: 20 })

      const [countriesResult, initialCitiesResult, expCities] = await Promise.all([
        destination.getCountries({ page: 1, limit: 20 }),
        initialCitiesPromise,
        expCityIds.length > 0 ? destination.getCitiesByIds(expCityIds) : Promise.resolve([]),
      ])

      const countryDocs = countriesResult.docs || []
      const dropdownCities = initialCitiesResult.docs || []

      const combinedCityMap = new Map<number, any>()
      for (const c of dropdownCities) {
        combinedCityMap.set(Number(c.id), c)
      }
      for (const c of expCities) {
        if (!combinedCityMap.has(Number(c.id))) {
          combinedCityMap.set(Number(c.id), c)
        }
      }
      const cityDocs = Array.from(combinedCityMap.values())

      const rawCitiesByIdMap = new Map(
        cityDocs.map((c: any) => [
          Number(c.id),
          {
            id: Number(c.id),
            name: String(c.name || ''),
            countryName:
              c.country && typeof c.country === 'object' ? String(c.country.name || '') : '',
          },
        ])
      )

      const rawTexts: string[] = []
      for (const exp of catalog.experiences || []) {
        const item = exp as Record<string, any>
        rawTexts.push(item.title || '')
        const originCityObj = rawCitiesByIdMap.get(Number(item.cityId))
        const locationText = originCityObj
          ? originCityObj.countryName
            ? `${originCityObj.name}, ${originCityObj.countryName}`
            : originCityObj.name
          : ''
        rawTexts.push(locationText)
      }

      const experienceTextsCount = rawTexts.length

      for (const c of countryDocs) {
        if (c.name) rawTexts.push(String(c.name))
      }
      for (const c of cityDocs) {
        if (c.name) rawTexts.push(String(c.name))
      }

      const translated = await localization.translateBatch(rawTexts, ctx)
      let textIdx = experienceTextsCount

      const destinationCountries = countryDocs.map((c: any) => ({
        id: Number(c.id),
        name: c.name ? (translated[textIdx++] || String(c.name)) : '',
        slug: String(c.slug || ''),
      }))

      const destCountryMap = new Map(destinationCountries.map((c) => [c.id, c.name]))

      const destinationCities = cityDocs.map((c: any) => {
        const cId = c.country
          ? typeof c.country === 'object'
            ? Number(c.country.id)
            : Number(c.country)
          : 0
        const cName =
          destCountryMap.get(cId) ||
          (c.country && typeof c.country === 'object' ? String(c.country.name) : '')
        return {
          id: Number(c.id),
          name: c.name ? (translated[textIdx++] || String(c.name)) : '',
          slug: String(c.slug || ''),
          heroUrl:
            c.hero && typeof c.hero === 'object'
              ? c.hero.url
              : typeof c.hero === 'string'
                ? c.hero
                : '',
          countryId: cId,
          countryName: cName,
        }
      })

      const citiesByIdMap = new Map(destinationCities.map((c) => [c.id, c]))
      const todayStr = getBusinessDateString(ctx.timezone)
      const startingPricesMap = await experience.resolveStartingPricesBatch(
        catalog.experiences,
        todayStr,
      )

      const expIds = (catalog.experiences || [])
        .map((e: any) => Number(e.id))
        .filter((id: number) => id > 0)
      const expAggregates = expIds.length > 0 ? await experience.getManyByIds(expIds) : []
      const expMap = new Map(expAggregates.map((e) => [e.id, e]))

      const experiences = await Promise.all(
        (catalog.experiences || []).map(async (exp, index) => {
          const item = exp as Record<string, any>
          const expEntity = expMap.get(Number(item.id))

          // Authoritative Origin Gateway City Waypoint from Domain Aggregate cityId
          const originCityObj = citiesByIdMap.get(Number(item.cityId))
          const originCityName = originCityObj?.name
          const originCityHero = originCityObj?.heroUrl

          const rawLocation = originCityObj
            ? originCityObj.countryName
              ? `${originCityObj.name}, ${originCityObj.countryName}`
              : originCityObj.name
            : ''
          const translatedTitle = translated[index * 2] || item.title || ''
          const translatedLocation = translated[index * 2 + 1] || rawLocation
          const basePriceEGP = startingPricesMap.get(item.id) ?? (item.price || 0)
          const priceResult = await localization.formatPrice(basePriceEGP, ctx)

          // Ordered Post-Origin Destination Waypoints
          const destinationCityNames: string[] = []
          const destinationCityHeroes: string[] = []
          for (const dId of expEntity?.destinations || []) {
            const destCity = citiesByIdMap.get(Number(dId))
            if (destCity) {
              if (destCity.name) destinationCityNames.push(destCity.name)
              if (destCity.heroUrl) destinationCityHeroes.push(destCity.heroUrl)
            }
          }

          // Canonical Journey Route: Origin + Sequential Destinations
          const routeCities = [originCityName, ...destinationCityNames].filter(
            (name): name is string => typeof name === 'string' && name.trim().length > 0,
          )

          // Visual City Avatars representing the Journey's Waypoints (Strictly authentic from city records)
          const thumbnails = [originCityHero, ...destinationCityHeroes].filter(
            (url): url is string => typeof url === 'string' && url.length > 0,
          )

          // Real included provisions strictly from database
          const rawIncluded =
            expEntity?.included && expEntity.included.length > 0
              ? expEntity.included
              : Array.isArray((item as any).included)
                ? (item as any).included
                    .map((x: any) => (typeof x === 'object' && x ? x.item : x))
                    .filter(Boolean)
                : []

          const features = rawIncluded.slice(0, 3)

          return {
            id: Number(item.id),
            slug: item.slug,
            title: translatedTitle,
            subtitle: item.subtitle ? localization.translateUiKey(item.subtitle, ctx) : '',
            type: (item.type === 'daily_tour' ? 'daily_tour' : 'package') as
              'package' | 'daily_tour',
            imageUrl: item.heroUrl || '',
            location: translatedLocation,
            durationDays: item.durationDays,
            rating: typeof item.rating === 'number' ? item.rating : 0,
            reviewsCount: typeof item.reviewsCount === 'number' ? item.reviewsCount : 0,
            price: priceResult,
            routeCities,
            thumbnails,
            features,
          }
        }),
      )

      const labels = {
        badge: localization.translateUiKey('catalog.badge', ctx),
        title: localization.translateUiKey('catalog.title', ctx),
        description: localization.translateUiKey('catalog.description', ctx),
        filterAll: localization
          .translateUiKey('catalog.filterAll', ctx)
          .replace('{count}', String(catalog.totalItems)),
        filterPackages: localization.translateUiKey('catalog.filterPackages', ctx),
        filterDailyTours: localization.translateUiKey('catalog.filterDailyTours', ctx),
        viewItinerary: localization.translateUiKey('catalog.viewItinerary', ctx),
        packageLabel: localization.translateUiKey('catalog.packageLabel', ctx),
        dailyTourLabel: localization.translateUiKey('catalog.dailyTourLabel', ctx),
      }

      return {
        filters,
        experiences,
        destinations: {
          countries: destinationCountries,
          cities: destinationCities,
          countriesPagination: {
            page: countriesResult.page ?? 1,
            limit: countriesResult.limit ?? 20,
            totalItems: countriesResult.totalDocs ?? destinationCountries.length,
            totalPages: countriesResult.totalPages ?? 1,
            hasNextPage: Boolean(countriesResult.hasNextPage),
            hasPrevPage: Boolean(countriesResult.hasPrevPage),
          },
          citiesPagination: {
            page: initialCitiesResult.page ?? 1,
            limit: initialCitiesResult.limit ?? 20,
            totalItems: initialCitiesResult.totalDocs ?? destinationCities.length,
            totalPages: initialCitiesResult.totalPages ?? 1,
            hasNextPage: Boolean(initialCitiesResult.hasNextPage),
            hasPrevPage: Boolean(initialCitiesResult.hasPrevPage),
          },
        },
        budgetPresets,
        facets: catalog.facets,
        pagination: {
          page: catalog.page,
          limit: catalog.limit,
          totalPages: catalog.totalPages,
          totalItems: catalog.totalItems,
          hasNextPage: catalog.hasNextPage,
          hasPrevPage: catalog.hasPrevPage,
        },
        labels,
      }
    } catch (err: unknown) {
      console.error('[ExperiencesCatalogLoader] Error loading catalog:', err)
      throw err
    }
  }
}
