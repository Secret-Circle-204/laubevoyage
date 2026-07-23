import type { SearchQueryDTO, SearchResultItemDTO, SearchResponseDTO } from './types'
import { SearchFacetEngine } from './facet-engine'
import { SearchAvailabilityFilter } from './availability-filter'

/**
 * High-Speed Pre-Indexed Query Pipeline
 * Executes multi-criteria searches in < 50ms without DB table scans.
 */
export class SearchQueryPipeline {
  private index: SearchResultItemDTO[] = []

  constructor(initialIndex?: SearchResultItemDTO[]) {
    if (initialIndex) {
      this.index = initialIndex
    }
  }

  updateIndex(items: SearchResultItemDTO[]): void {
    this.index = items
  }

  executeSearch(query: SearchQueryDTO): SearchResponseDTO {
    const startTime = performance.now()

    let results = [...this.index]

    // 1. Keyword search
    if (query.keyword && query.keyword.trim() !== '') {
      const q = query.keyword.toLowerCase().trim()
      results = results.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.cityName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q),
      )
    }

    // 2. Price bounds filter
    if (query.minPriceEGP !== undefined) {
      results = results.filter((item) => item.priceEGP >= query.minPriceEGP!)
    }
    if (query.maxPriceEGP !== undefined) {
      results = results.filter((item) => item.priceEGP <= query.maxPriceEGP!)
    }

    // 3. Duration filter
    if (query.durationDays !== undefined) {
      results = results.filter((item) => item.durationDays === query.durationDays)
    }

    // 4. Availability filter
    const passengers = query.passengersCount || 1
    results = SearchAvailabilityFilter.filterAvailable(results, passengers)

    // 5. Facets computation
    const facets = SearchFacetEngine.computeFacets(results)

    const executionTimeMs = performance.now() - startTime

    return {
      items: results,
      totalItems: results.length,
      totalPages: 1,
      currentPage: query.page || 1,
      facets,
      executionTimeMs,
    }
  }
}
