import { getDomainServices } from '@/domains/factory'
import type { GlobalSearchQueryDTO, GlobalSearchPageDTO, GlobalSearchResultItemDTO } from './dto'

export class GlobalSearchLoader {
  static async load(queryDTO: GlobalSearchQueryDTO): Promise<GlobalSearchPageDTO> {
    const query = queryDTO.query || ''
    const page = queryDTO.page || 1
    const limit = queryDTO.limit || 12

    try {
      const { search, localization } = await getDomainServices()
      const ctx = await localization.buildContext({
        cookieLocale: queryDTO.locale,
        cookieCurrency: queryDTO.currency,
      })

      const domainResponse = await search.search({
        keyword: query,
        category: queryDTO.category,
        minPriceEGP: queryDTO.minPrice,
        maxPriceEGP: queryDTO.maxPrice,
        minRating: queryDTO.rating,
        page,
        limit,
      })

      const rawTitles = (domainResponse?.items || []).map((item: any) => item.title || '')
      const translatedTitles = await localization.translateBatch(rawTitles, ctx)

      const items: GlobalSearchResultItemDTO[] = await Promise.all(
        (domainResponse?.items || []).map(async (item: any, idx: number) => {
          const translatedTitle = translatedTitles[idx] || item.title || ''
          const priceResult = await localization.formatPrice(item.priceEGP || 0, ctx)

          return {
            id: item.experienceId,
            title: translatedTitle,
            subtitle: `${item.cityName || ''}, ${item.countryName || ''} • ${item.durationDays || 1} Days`,
            type: 'experience' as const,
            url: `/experiences/${item.slug}`,
            imageUrl: item.thumbnailUrl || '/images/hero-bg.jpg',
            price: priceResult,
            rating: item.rating,
          }
        }),
      )

      return {
        query,
        totalResults: domainResponse?.totalItems || 0,
        items,
        facets: {
          categories: (domainResponse?.facets?.categories || []).map((c: any) => String(c.label)),
          minPrice: domainResponse?.facets?.priceRange?.min || 0,
          maxPrice: domainResponse?.facets?.priceRange?.max || 0,
        },
        pagination: {
          page: domainResponse?.currentPage || page,
          limit,
          totalPages: domainResponse?.totalPages || 0,
          totalItems: domainResponse?.totalItems || 0,
          hasNextPage: (domainResponse?.currentPage || 1) < (domainResponse?.totalPages || 0),
          hasPrevPage: (domainResponse?.currentPage || 1) > 1,
        },
      }
    } catch (err) {
      console.error(`[GlobalSearchLoader] Failed performing global search for query "${query}":`, err)
      throw err
    }
  }
}
