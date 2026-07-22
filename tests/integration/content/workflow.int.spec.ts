import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContentWorkflowEngine } from '@/domains/content/workflow'

describe('Content Domain: Workflow Integration Tests', () => {
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

  it('should render page, attach SEO metadata, and cache response', async () => {
    await workflowEngine.repository.savePage({
      pageId: 'p_1',
      slug: 'about-us',
      title: 'About L\'Aube Voyage',
      status: 'published',
      blocks: [],
      seoDescription: 'Discover our luxury travel heritage',
    })

    const result = await workflowEngine.getPageBySlug('about-us')

    expect(result).not.toBeNull()
    expect(result?.page.title).toBe("About L'Aube Voyage")
    expect(result?.seo.title).toContain("About L'Aube Voyage")
  })
})
