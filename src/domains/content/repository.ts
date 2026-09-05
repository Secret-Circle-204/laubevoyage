import type { Payload } from 'payload'
import type { ContentPageEntity } from './types'

/**
 * Content Repository
 * Data persistence layer for Pages, Posts, Faqs, and MediaGallery Payload collections.
 */
export class ContentRepository {
  private payload: Payload
  private pages: Map<string, ContentPageEntity> = new Map()

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findPageBySlug(slug: string): Promise<ContentPageEntity | null> {
    return this.pages.get(slug) || null
  }

  async savePage(page: ContentPageEntity): Promise<ContentPageEntity> {
    this.pages.set(page.slug, page)
    return page
  }

  async findBlogArticles(params?: { page?: number; limit?: number; category?: string }) {
    const page = params?.page || 1
    const limit = params?.limit || 9

    return this.payload.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
        ...(params?.category ? { category: { equals: params.category } } : {}),
      },
      page,
      limit,
      sort: '-publishedAt',
    })
  }

  async findArticleBySlug(slug: string) {
    const res = await this.payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    return res.docs[0] || null
  }

  async findFaqs(params?: { category?: string; page?: number; limit?: number }) {
    const page = params?.page || 1
    const limit = params?.limit || 50
    const where: Record<string, any> = {}
    if (params?.category) {
      where.category = { equals: params.category }
    }

    return this.payload.find({
      collection: 'faqs',
      where,
      page,
      limit,
    })
  }

  /**
   * Start a database transaction.
   */
  async beginTransaction(): Promise<string | number | null> {
    if (this.payload?.db && typeof this.payload.db.beginTransaction === 'function') {
      return this.payload.db.beginTransaction()
    }
    return null
  }

  /**
   * Commit a database transaction.
   */
  async commitTransaction(transactionID: string | number | null): Promise<void> {
    if (
      transactionID !== null &&
      transactionID !== undefined &&
      this.payload?.db &&
      typeof this.payload.db.commitTransaction === 'function'
    ) {
      await this.payload.db.commitTransaction(transactionID)
    }
  }

  /**
   * Rollback a database transaction.
   */
  async rollbackTransaction(transactionID: string | number | null): Promise<void> {
    if (
      transactionID !== null &&
      transactionID !== undefined &&
      this.payload?.db &&
      typeof this.payload.db.rollbackTransaction === 'function'
    ) {
      try {
        await this.payload.db.rollbackTransaction(transactionID)
      } catch (err: unknown) {
        // Rollback error handling
      }
    }
  }

  async createContactRequest(
    data: { name: string; email: string; subject: string; message: string },
    context?: import('@/types').RequestContext | import('payload').PayloadRequest,
  ) {
    const req = context && 'transactionID' in context ? (context as import('payload').PayloadRequest) : undefined
    return this.payload.create({
      collection: 'contact-requests',
      data: {
        name: data.name.trim(),
        email: data.email.trim(),
        subject: data.subject.trim(),
        message: data.message.trim(),
      },
      req,
    })
  }
}
