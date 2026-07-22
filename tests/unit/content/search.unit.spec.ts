import { describe, it, expect } from 'vitest'
import { ContentSearchIndexer } from '@/domains/content/search-indexer'

describe('Content Domain: Pre-Indexed Search Unit Tests', () => {
  it('should search pre-indexed content in < 50ms budget', () => {
    const startTime = performance.now()
    const results = ContentSearchIndexer.search('Luxor')
    const duration = performance.now() - startTime

    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].title).toContain('Luxor')
    expect(duration).toBeLessThan(50) // Search budget < 50ms
  })
})
