import { getDomainServices } from '@/domains/factory'
import { getBusinessDateString } from '@/lib/date'
import { formatExperienceDuration } from '@/domains/experience/duration-formatter'
import type { GlobalSearchQueryDTO, GlobalSearchPageDTO, GlobalSearchResultItemDTO } from './dto'

export class GlobalSearchLoader {
  static async load(queryDTO: GlobalSearchQueryDTO): Promise<GlobalSearchPageDTO> {
    const query = queryDTO.query || ''
    const page = queryDTO.page || 1
    const limit = queryDTO.limit || 12

    try {
      const { experience, destination, localization } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: queryDTO.locale,
        cookieCurrency: queryDTO.currency,
      })

      // 1. Canonical City Resolution (Dynamic Database Check)
      let resolvedCityId: number | undefined
      if (query.trim()) {
        const canonicalCity = await destination.getCanonicalCity(query)
        if (canonicalCity) {
          resolvedCityId = Number(canonicalCity.id)
        }
      }

      // 2. Authoritative Database-Filtered Search with Server-Side Pagination
      const domainResponse = await experience.search({
        keyword: resolvedCityId ? undefined : query,
        cityId: resolvedCityId,
        type: (queryDTO.category === 'package' || queryDTO.category === 'daily_tour') ? queryDTO.category : undefined,
        minPriceEGP: queryDTO.minPrice,
        maxPriceEGP: queryDTO.maxPrice,
        page,
        limit,
        sort: '-createdAt',
      })

      const rawTexts: string[] = []
      for (const exp of domainResponse.docs || []) {
        const item = exp as Record<string, any>
        rawTexts.push(item.title || '')
        const locationText = item.cityName && item.countryName
          ? `${item.cityName}, ${item.countryName}`
          : (item.cityName || item.countryName || '')
        rawTexts.push(locationText)
      }

      const translated = await localization.translateBatch(rawTexts, ctx)
      const todayStr = getBusinessDateString(ctx.timezone)
      const startingPricesMap = await experience.resolveStartingPricesBatch(domainResponse.docs, todayStr)

      const items: GlobalSearchResultItemDTO[] = await Promise.all(
        (domainResponse.docs || []).map(async (exp: any, idx: number) => {
          const item = exp as Record<string, any>
          const rawLocation = item.cityName && item.countryName
            ? `${item.cityName}, ${item.countryName}`
            : (item.cityName || item.countryName || '')
          const translatedTitle = translated[idx * 2] || item.title || ''
          const translatedLocation = translated[idx * 2 + 1] || rawLocation

          const basePriceEGP = startingPricesMap.get(item.id) ?? (item.price || 0)
          const priceResult = await localization.formatPrice(basePriceEGP, ctx)

          let formattedDur = ''
          if (item.type === 'package' && item.durationDays && item.durationDays >= 1) {
            formattedDur = formatExperienceDuration({
              type: 'package',
              days: item.durationDays,
              nights: item.durationNights,
            })
          } else if (item.type === 'daily_tour' && item.durationMinutes && item.durationMinutes >= 15) {
            formattedDur = formatExperienceDuration({
              type: 'daily_tour',
              durationMinutes: item.durationMinutes,
            })
          }

          const subtitleParts = [translatedLocation, formattedDur].filter(Boolean).join(' • ')

          return {
            id: item.id,
            title: translatedTitle,
            subtitle: subtitleParts,
            type: 'experience' as const,
            experienceType: (item.type === 'daily_tour' ? 'daily_tour' : 'package') as 'package' | 'daily_tour',
            url: `/experiences/${item.slug}`,
            imageUrl: item.heroUrl || '',
            price: priceResult,
          }
        }),
      )

      const labels = {
        badge: localization.translateUiKey('search.badge', ctx),
        title: localization.translateUiKey('search.title', ctx),
        resultsForQuery: localization.translateUiKey('search.resultsForQuery', ctx),
        resultsAll: localization.translateUiKey('search.resultsAll', ctx),
        placeholder: localization.translateUiKey('search.placeholder', ctx),
        searchButton: localization.translateUiKey('search.searchButton', ctx),
        filterAll: localization.translateUiKey('search.filterAll', ctx),
        filterPackages: localization.translateUiKey('search.filterPackages', ctx),
        filterDailyTours: localization.translateUiKey('search.filterDailyTours', ctx),
        emptyTitle: localization.translateUiKey('search.emptyTitle', ctx),
        emptyDescription: localization.translateUiKey('search.emptyDescription', ctx),
        emptyAction: localization.translateUiKey('search.emptyAction', ctx),
        exploreItem: localization.translateUiKey('search.exploreItem', ctx),
        previousPage: localization.translateUiKey('search.previousPage', ctx),
        nextPage: localization.translateUiKey('search.nextPage', ctx),
        pageOf: localization.translateUiKey('search.pageOf', ctx),
        showingCount: localization.translateUiKey('search.showingCount', ctx),
      }

      return {
        query,
        activeCategory: (queryDTO.category === 'package' || queryDTO.category === 'daily_tour') ? queryDTO.category : undefined,
        totalResults: domainResponse.totalDocs || 0,
        items,
        facets: {
          categories: ['package', 'daily_tour'],
          minPrice: queryDTO.minPrice || 0,
          maxPrice: queryDTO.maxPrice || 0,
        },
        pagination: {
          page: domainResponse.page,
          limit: domainResponse.limit,
          totalPages: domainResponse.totalPages,
          totalItems: domainResponse.totalDocs,
          hasNextPage: domainResponse.hasNextPage,
          hasPrevPage: domainResponse.hasPrevPage,
        },
        labels,
      }
    } catch (err) {
      console.error(`[GlobalSearchLoader] Failed performing global search for query "${query}":`, err)
      throw err
    }
  }
}

