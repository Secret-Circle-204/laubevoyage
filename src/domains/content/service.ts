import { ContentWorkflowEngine } from './workflow'
import { ContentSlugService } from './slug-service'
import { ContentSearchIndexer } from './search-indexer'
import { ContentCacheManager } from './cache-manager'
import { ContentRepository } from './repository'
import type { ContentPageEntity, SeoMetadataDTO, ContentSearchResult } from './types'
import { JsonTranslationDictionary, type ITranslationDictionary } from '../translation/dictionary'
import { EventOutboxService } from '../events/outbox'
import type { NotificationService } from '../notification/service'
import type { PayloadRequest } from 'payload'

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

  async getFaqs(params?: { category?: string; page?: number; limit?: number }) {
    return this.repository.findFaqs(params)
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

  getRepository(): ContentRepository {
    return this.repository
  }

  /**
   * Submit and persist contact request with transactional event recording and notification enqueue.
   */
  async submitContactRequest(
    data: { name: string; email: string; subject: string; message: string },
    notificationService: NotificationService,
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Fail Fast validation
    if (!data.name?.trim() || !data.email?.trim() || !data.subject?.trim() || !data.message?.trim()) {
      return { success: false, error: 'All fields are required.' }
    }

    if (!data.email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    let transactionID: string | number | null = null

    try {
      // Start database transactional context via repository boundary
      const activeTx = await this.repository.beginTransaction()
      if (activeTx === null) {
        throw new Error('[ContentService.submitContactRequest] Failed to start database transaction.')
      }
      transactionID = activeTx

      const req = {
        transactionID,
      } as unknown as PayloadRequest

      // 2. Persist in database via repository
      const doc = await this.repository.createContactRequest(data, req)

      // 3. Publish CONTACT_REQUEST_SUBMITTED event via Outbox
      const outbox = EventOutboxService.getInstance()
      await outbox.recordAndPublish({
        type: 'CONTACT_REQUEST_SUBMITTED',
        eventVersion: 1,
        contactRequestId: Number(doc.id),
        name: doc.name,
        email: doc.email,
        subject: doc.subject,
        timestamp: new Date().toISOString(),
      }, req)

      // 4. Enqueue confirmation auto-response email via NotificationService
      await notificationService.enqueueNotification({
        referenceType: 'contact-requests',
        referenceId: String(doc.id),
        recipient: doc.email,
        channel: 'email',
        category: 'marketing',
        templateId: 'welcome_email',
        translationKey: 'welcome_email',
        templateData: {
          name: doc.name,
        },
      }, req)

      // Commit the database transaction via repository boundary
      await this.repository.commitTransaction(transactionID)

      return { success: true }
    } catch (error: unknown) {
      console.error('[ContentService.submitContactRequest] Operation failed. Rolling back transaction.', error)
      if (transactionID) {
        await this.repository.rollbackTransaction(transactionID)
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit contact request.',
      }
    }
  }
}
