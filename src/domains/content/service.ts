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
    const isAr = locale === 'ar'
    return [
      {
        title: isAr ? 'استكشف' : 'Explore',
        links: [
          { label: isAr ? 'جميع التجارب' : 'All Experiences', href: '/experiences' },
          { label: isAr ? 'الوجهات' : 'Destinations', href: '/destinations' },
          { label: isAr ? 'برامج الجولات' : 'Tour Packages', href: '/experiences?type=package' },
          { label: isAr ? 'الجولات اليومية' : 'Daily Tours', href: '/experiences?type=daily_tour' },
        ],
      },
      {
        title: isAr ? 'الشركة' : 'Company',
        links: [
          { label: isAr ? 'عن الشركة' : 'About Us', href: '/about' },
          { label: isAr ? 'مدونة السفر' : 'Travel Blog', href: '/blog' },
          { label: isAr ? 'الأسئلة الشائعة' : 'FAQs', href: '/faq' },
          { label: isAr ? 'اتصل بنا' : 'Contact Us', href: '/contact' },
        ],
      },
      {
        title: isAr ? 'القانونية' : 'Legal',
        links: [
          { label: isAr ? 'سياسة الخصوصية' : 'Privacy Policy', href: '/privacy' },
          { label: isAr ? 'شروط الخدمة' : 'Terms of Service', href: '/terms' },
          { label: isAr ? 'بوابة العملاء' : 'Customer Portal', href: '/dashboard' },
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
