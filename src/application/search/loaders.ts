import { getDomainServices } from '@/domains/factory'
import type { GlobalSearchQueryDTO, GlobalSearchPageDTO, GlobalSearchResultItemDTO } from './dto'

export class GlobalSearchLoader {
  static async load(queryDTO: GlobalSearchQueryDTO): Promise<GlobalSearchPageDTO> {
    const query = queryDTO.query || ''
    const page = queryDTO.page || 1
    const limit = queryDTO.limit || 12

    try {
      const { search } = await getDomainServices()
      const domainResponse = await search.search({
        keyword: query,
        category: queryDTO.category,
        minPriceEGP: queryDTO.minPrice,
        maxPriceEGP: queryDTO.maxPrice,
        minRating: queryDTO.rating,
        page,
        limit,
      })

      const items: GlobalSearchResultItemDTO[] = (domainResponse?.items || []).map((item: any) => ({
        id: item.experienceId,
        title: item.title || '',
        subtitle: `${item.cityName || ''}, ${item.countryName || ''} • ${item.durationDays || 1} Days`,
        type: 'experience' as const,
        url: `/experiences/${item.slug}`,
        imageUrl: item.thumbnailUrl || '/images/hero-bg.jpg',
        priceEGP: item.priceEGP,
        rating: item.rating,
      }))

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
    } catch {
      return {
        query,
        totalResults: 0,
        items: [],
        facets: {
          categories: [],
          minPrice: 0,
          maxPrice: 0,
        },
        pagination: {
          page: 1,
          limit,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
    }
  }
}
