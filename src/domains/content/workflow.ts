import type { Payload } from 'payload'
import { ContentRepository } from './repository'
import { ContentPolicy } from './policy'
import { ContentSeoEngine } from './seo-engine'
import { ContentCacheManager } from './cache-manager'
import { ContentTranslationBridge } from './translation-bridge'
import type { ContentPageEntity, SeoMetadataDTO } from './types'

/**
 * Content Workflow Engine
 * Central orchestrator handling CMS Page rendering, caching (<10ms), SEO metadata generation, and ISR revalidation.
 */
export class ContentWorkflowEngine {
  public repository: ContentRepository
  public translationBridge: ContentTranslationBridge

  constructor(payload: Payload) {
    this.repository = new ContentRepository(payload)
    this.translationBridge = new ContentTranslationBridge(payload)
  }

  async getPageBySlug(slug: string): Promise<{ page: ContentPageEntity; seo: SeoMetadataDTO } | null> {
    // 1. Try cache (<10ms budget)
    const cached = ContentCacheManager.getCachedPage(slug)
    if (cached) {
      return cached as any
    }

    // 2. Query Repository
    const page = await this.repository.findPageBySlug(slug)
    if (!page) return null

    // 3. Check Policy
    const policyResult = ContentPolicy.canPubliclyView(page.status)
    if (!policyResult.allowed) {
      return null
    }

    // 4. Generate SEO Metadata
    const seo = ContentSeoEngine.generateSeoMetadata({
      title: page.title,
      description: page.seoDescription,
      slug: page.slug,
      ogImage: page.ogImage,
    })

    const result = { page, seo }
    ContentCacheManager.setCachedPage(slug, result as any)

    return result
  }
}
