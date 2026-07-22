import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContentWorkflowEngine } from '@/domains/content/workflow'

describe('Content Domain: Performance Budget & Cache Read Tests', () => {
  let mockPayload: any
  let workflowEngine: ContentWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn(),
    }
    workflowEngine = new ContentWorkflowEngine(mockPayload)
  })

  it('should enforce page read from cache duration < 10ms budget', async () => {
    await workflowEngine.repository.savePage({
      pageId: 'p_perf',
      slug: 'perf-page',
      title: 'Performance Page',
      status: 'published',
      blocks: [],
    })

    // Warm up cache
    await workflowEngine.getPageBySlug('perf-page')

    const startTime = performance.now()
    const result = await workflowEngine.getPageBySlug('perf-page')
    const duration = performance.now() - startTime

    expect(result).not.toBeNull()
    expect(duration).toBeLessThan(10) // Cache read budget < 10ms
  })
})
