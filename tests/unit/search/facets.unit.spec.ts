import { describe, it, expect } from 'vitest'
import { SearchFacetEngine } from '@/domains/search/facet-engine'
import type { SearchResultItemDTO } from '@/domains/search/types'

describe('Search Domain: Dynamic Facets Aggregation Unit Tests', () => {
  it('should compute dynamic price range and category counts correctly', () => {
    const items: SearchResultItemDTO[] = [
      {
        experienceId: 1,
        title: 'Tour 1',
        slug: 'tour-1',
        countryName: 'Egypt',
        cityName: 'Cairo',
        category: 'Historical',
        durationDays: 1,
        priceEGP: 1000,
        rating: 5,
        reviewCount: 10,
        thumbnailUrl: '',
        availableSeats: 5,
      },
      {
        experienceId: 2,
        title: 'Tour 2',
        slug: 'tour-2',
        countryName: 'Egypt',
        cityName: 'Luxor',
        category: 'Nile Cruise',
        durationDays: 5,
        priceEGP: 15000,
        rating: 4,
        reviewCount: 20,
        thumbnailUrl: '',
        availableSeats: 10,
      },
    ]

    const facets = SearchFacetEngine.computeFacets(items)

    expect(facets.priceRange.min).toBe(1000)
    expect(facets.priceRange.max).toBe(15000)
    expect(facets.categories.length).toBe(2)
  })
})
