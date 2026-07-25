import { ContentWorkflowEngine } from './workflow'
import { ContentSlugService } from './slug-service'
import { ContentSearchIndexer } from './search-indexer'
import { ContentCacheManager } from './cache-manager'
import { ContentRepository } from './repository'
import type { ContentPageEntity, SeoMetadataDTO, ContentSearchResult } from './types'
import { JsonTranslationDictionary, type ITranslationDictionary } from '../translation/dictionary'

/**
 * Content Domain Service (Enterprise Thin Facade)
 * Single entry point for all CMS Page rendering, blog publishing, search indexing, and SEO generation.
 */
export class ContentService {
  private repository: ContentRepository
  private workflowEngine: ContentWorkflowEngine
  private uiDictionary: ITranslationDictionary

  constructor(repository: ContentRepository, uiDictionary?: ITranslationDictionary) {
    this.repository = repository
    this.workflowEngine = new ContentWorkflowEngine(repository)
    this.uiDictionary = uiDictionary || new JsonTranslationDictionary()
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
      { label: this.uiDictionary.get(locale, 'layout.nav.home'), href: '/' },
      { label: this.uiDictionary.get(locale, 'layout.nav.experiences'), href: '/experiences' },
      { label: this.uiDictionary.get(locale, 'layout.nav.destinations'), href: '/destinations' },
      { label: this.uiDictionary.get(locale, 'layout.nav.about'), href: '/about' },
    ]
  }

  async getFooterNavigation(locale: string = 'en') {
    return [
      {
        title: this.uiDictionary.get(locale, 'layout.footer.explore'),
        links: [
          { label: this.uiDictionary.get(locale, 'layout.footer.allExperiences'), href: '/experiences' },
          { label: this.uiDictionary.get(locale, 'layout.footer.destinations'), href: '/destinations' },
          { label: this.uiDictionary.get(locale, 'layout.footer.tourPackages'), href: '/experiences?type=package' },
          { label: this.uiDictionary.get(locale, 'layout.footer.dailyTours'), href: '/experiences?type=daily_tour' },
        ],
      },
      {
        title: this.uiDictionary.get(locale, 'layout.footer.company'),
        links: [
          { label: this.uiDictionary.get(locale, 'layout.footer.aboutUs'), href: '/about' },
          { label: this.uiDictionary.get(locale, 'layout.footer.travelBlog'), href: '/blog' },
          { label: this.uiDictionary.get(locale, 'layout.footer.faqs'), href: '/faq' },
          { label: this.uiDictionary.get(locale, 'layout.footer.contactUs'), href: '/contact' },
        ],
      },
      {
        title: this.uiDictionary.get(locale, 'layout.footer.legal'),
        links: [
          { label: this.uiDictionary.get(locale, 'layout.footer.privacyPolicy'), href: '/privacy' },
          { label: this.uiDictionary.get(locale, 'layout.footer.termsOfService'), href: '/terms' },
          { label: this.uiDictionary.get(locale, 'layout.footer.customerPortal'), href: '/dashboard' },
        ],
      },
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
