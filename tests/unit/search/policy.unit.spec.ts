import { describe, it, expect } from 'vitest'
import { SearchPolicy } from '@/domains/search/policy'

describe('Search Domain: Query Validation Policy Unit Tests', () => {
  it('should invalidate search query if minPriceEGP > maxPriceEGP', () => {
    const result = SearchPolicy.validateQuery({ minPriceEGP: 5000, maxPriceEGP: 1000 })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Minimum price cannot exceed maximum price')
  })
})
