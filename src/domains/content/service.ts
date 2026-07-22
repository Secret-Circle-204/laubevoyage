import type { Payload } from 'payload'
import { ContentWorkflowEngine } from './workflow'
import { ContentSlugService } from './slug-service'
import { ContentSearchIndexer } from './search-indexer'
import { ContentCacheManager } from './cache-manager'
import type { ContentPageEntity, SeoMetadataDTO, ContentSearchResult } from './types'

/**
 * Content Domain Service (Enterprise Thin Facade)
 * Single entry point for all CMS Page rendering, blog publishing, search indexing, and SEO generation.
 */
export class ContentService {
  private workflowEngine: ContentWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new ContentWorkflowEngine(payload)
  }

  async getPage(slug: string): Promise<{ page: ContentPageEntity; seo: SeoMetadataDTO } | null> {
    return this.workflowEngine.getPageBySlug(slug)
  }

  searchContent(query: string): ContentSearchResult[] {
    return ContentSearchIndexer.search(query)
  }

  revalidatePage(slug: string): { revalidated: boolean; durationMs: number } {
    return ContentCacheManager.invalidateAndRevalidate(slug)
  }

  getRedirect(slug: string) {
    return ContentSlugService.getRedirect(slug)
  }
}
