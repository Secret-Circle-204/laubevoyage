import { describe, it, expect } from 'vitest'
import { SearchQueryPipeline } from '@/domains/search/query-pipeline'

describe('Search Domain: Performance Budget & Speed Tests', () => {
  it('should execute multi-criteria search in < 50ms budget', () => {
    const pipeline = new SearchQueryPipeline([
      {
        experienceId: 1,
        title: 'Red Sea Scuba Diving & Beach Resort',
        slug: 'red-sea-diving',
        countryName: 'Egypt',
        cityName: 'Hurghada',
        category: 'Beach Resort',
        durationDays: 3,
        priceEGP: 8500,
        rating: 4,
        reviewCount: 28,
        thumbnailUrl: '/images/red-sea.jpg',
        availableSeats: 6,
      },
    ])

    const startTime = performance.now()
    const response = pipeline.executeSearch({
      keyword: 'Red Sea',
      passengersCount: 2,
    })
    const duration = performance.now() - startTime

    expect(response.totalItems).toBeGreaterThanOrEqual(1)
    expect(duration).toBeLessThan(50) // Search performance budget < 50ms
  })
})
