import type { Payload } from 'payload'
import type { ContentPageEntity, BlogPostEntity, FaqItemEntity } from './types'

/**
 * Content Repository
 * Data persistence layer for Pages, Posts, Faqs, and MediaGallery Payload collections.
 */
export class ContentRepository {
  private payload: Payload
  private pages: Map<string, ContentPageEntity> = new Map()
  private posts: Map<string, BlogPostEntity> = new Map()

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

  async findPostBySlug(slug: string): Promise<BlogPostEntity | null> {
    return this.posts.get(slug) || null
  }

  async savePost(post: BlogPostEntity): Promise<BlogPostEntity> {
    this.posts.set(post.slug, post)
    return post
  }
}
