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

  async findFaqs() {
    return this.payload.find({
      collection: 'faqs',
      limit: 50,
    })
  }
}
