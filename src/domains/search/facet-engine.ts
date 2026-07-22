import type { SearchResultItemDTO, SearchFacetsDTO } from './types'

/**
 * Dynamic Facet Aggregation Engine
 * Calculates dynamic search facets (price min/max EGP, duration, categories, ratings) in real-time.
 */
export class SearchFacetEngine {
  static computeFacets(items: SearchResultItemDTO[]): SearchFacetsDTO {
    if (items.length === 0) {
      return {
        priceRange: { min: 0, max: 0 },
        durations: [],
        categories: [],
        countries: [],
        cities: [],
        ratings: [],
      }
    }

    const prices = items.map((i) => i.priceEGP)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const categoryCounts: Record<string, number> = {}
    const durationCounts: Record<number, number> = {}
    const ratingCounts: Record<number, number> = {}

    for (const item of items) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
      durationCounts[item.durationDays] = (durationCounts[item.durationDays] || 0) + 1
      ratingCounts[item.rating] = (ratingCounts[item.rating] || 0) + 1
    }

    return {
      priceRange: { min: minPrice, max: maxPrice },
      categories: Object.entries(categoryCounts).map(([cat, count]) => ({
        label: cat,
        value: cat,
        count,
      })),
      durations: Object.entries(durationCounts).map(([dur, count]) => ({
        label: `${dur} Days`,
        value: Number(dur),
        count,
      })),
      countries: [],
      cities: [],
      ratings: Object.entries(ratingCounts).map(([rat, count]) => ({
        label: `${rat} Stars`,
        value: Number(rat),
        count,
      })),
    }
  }
}
