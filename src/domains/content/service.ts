import { ContentWorkflowEngine } from './workflow'
import { ContentSlugService } from './slug-service'
import { ContentSearchIndexer } from './search-indexer'
import { ContentCacheManager } from './cache-manager'
import { ContentRepository } from './repository'
import type { ContentPageEntity, SeoMetadataDTO, ContentSearchResult } from './types'

/**
 * Content Domain Service (Enterprise Thin Facade)
 * Single entry point for all CMS Page rendering, blog publishing, search indexing, and SEO generation.
 */
export class ContentService {
  private repository: ContentRepository
  private workflowEngine: ContentWorkflowEngine

  constructor(repository: ContentRepository) {
    this.repository = repository
    this.workflowEngine = new ContentWorkflowEngine(repository)
  }

  async getPage(slug: string): Promise<{ page: ContentPageEntity; seo: SeoMetadataDTO } | null> {
    return this.workflowEngine.getPageBySlug(slug)
  }

  async getBlogArticles(params?: { page?: number; limit?: number; category?: string }) {
    return this.repository.findBlogArticles(params)
  }

  async getArticleBySlug(slug: string) {
    return this.repository.findArticleBySlug(slug)
  }

  async getFaqs() {
    return this.repository.findFaqs()
  }

  async getNavigationMenu(locale: string = 'en') {
    return [
      { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: '/' },
      { label: locale === 'ar' ? 'التجارب السياحية' : 'Experiences', href: '/experiences' },
      { label: locale === 'ar' ? 'الوجهات' : 'Destinations', href: '/destinations' },
      { label: locale === 'ar' ? 'مدونة السفر' : 'Blog', href: '/blog' },
      { label: locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ', href: '/faq' },
    ]
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
