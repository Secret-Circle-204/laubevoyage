import type { ExperienceService } from '@/domains/experience/service'
import type { SearchQueryDTO, SearchResponseDTO } from './types'

/**
 * Search Domain Service (SSOT Adapter Facade)
 * Delegates all discovery and search queries directly to authoritative Experience Domain.
 */
export class SearchService {
  private experienceService: ExperienceService

  constructor(experienceService: ExperienceService) {
    this.experienceService = experienceService
  }

  async search(query: SearchQueryDTO): Promise<SearchResponseDTO> {
    const res = await this.experienceService.search({
      keyword: query.keyword,
      type: query.category as any,
      minPriceEGP: query.minPriceEGP,
      maxPriceEGP: query.maxPriceEGP,
      page: query.page,
      limit: query.limit,
      sort: '-createdAt',
    })

    return {
      items: res.docs.map((d) => ({
        experienceId: d.id,
        title: d.title,
        slug: d.slug,
        cityId: d.cityId,
        cityName: '',
        countryName: '',
        category: d.type,
        experienceType: d.type,
        priceEGP: d.price || 0,
        durationDays: d.type === 'package' ? d.durationDays : undefined,
        durationNights: d.type === 'package' ? d.durationNights : undefined,
        durationMinutes: d.type === 'daily_tour' ? d.durationMinutes : undefined,
        availableSeats: 20,
        thumbnailUrl: d.heroUrl || '',
        rating: 5,
        reviewCount: 0,
      })),
      totalItems: res.totalDocs,
      currentPage: res.page,
      totalPages: res.totalPages,
      facets: {
        priceRange: { min: query.minPriceEGP || 0, max: query.maxPriceEGP || 0 },
        durations: [],
        categories: [],
        countries: [],
        cities: [],
        ratings: [],
      },
      executionTimeMs: 0,
    }
  }
}


