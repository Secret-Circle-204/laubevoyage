import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SearchWorkflowEngine } from '@/domains/search/workflow'

describe('Search Domain: Workflow Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: SearchWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn(),
    }
    workflowEngine = new SearchWorkflowEngine(mockPayload)
  })

  it('should execute multi-criteria search and compute facets in response', async () => {
    const response = await workflowEngine.executeSearch({
      keyword: 'Nile',
      passengersCount: 2,
    })

    expect(response.items.length).toBeGreaterThanOrEqual(1)
    expect(response.items[0].title).toContain('Nile')
    expect(response.facets.priceRange.min).toBeGreaterThan(0)
    expect(response.executionTimeMs).toBeLessThan(50)
  })
})
