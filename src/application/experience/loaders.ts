import { getDomainServices } from '@/domains/factory'
import type { ParsedExperienceSearchParams } from '../shared/parsers/experience-search-parser'
import type { ExperienceCatalogDTO } from './dto'

export class ExperiencesCatalogLoader {
  static async load(filters: ParsedExperienceSearchParams): Promise<ExperienceCatalogDTO> {
    const page = filters.page || 1
    const limit = 12

    try {
      const { experience } = await getDomainServices()
      const catalog = await experience.getCatalog({
        minPriceEGP: filters.minPrice,
        maxPriceEGP: filters.maxPrice,
        type: filters.type as any,
      })

      const experiences = (catalog.experiences || []).map((exp) => ({
        id: Number(exp.id),
        slug: exp.slug || '',
        title: exp.title || '',
        subtitle: exp.title || '',
        type: (exp.type || 'package') as 'package' | 'daily_tour',
        imageUrl: '',
        location: '',
        durationDays: exp.durationDays || 1,
        rating: 0,
        reviewsCount: 0,
        price: {
          amountEGP: exp.basePriceEGP || 0,
          displayAmount: exp.basePriceEGP || 0,
          displayCurrency: 'EGP',
        },
      }))

      return {
        filters,
        experiences,
        facets: catalog.facets,
        pagination: {
          page,
          limit,
          totalPages: catalog.totalItems > 0 ? 1 : 0,
          totalItems: catalog.totalItems,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
    } catch {
      return {
        filters,
        experiences: [],
        facets: {
          minPrice: 0,
          maxPrice: 0,
          categories: [],
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
