import type { ContentSlugRedirectEntity } from './types'

/**
 * Content Slug & 301 Redirect Service
 * Handles slug auto-generation, deduplication, and historical 301 redirect mapping.
 */
export class ContentSlugService {
  private static redirects: Map<string, ContentSlugRedirectEntity> = new Map()

  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  static recordSlugChange(oldSlug: string, newSlug: string): ContentSlugRedirectEntity {
    const redirect: ContentSlugRedirectEntity = {
      redirectId: `redir_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      oldSlug,
      newSlug,
      statusCode: 301,
      createdAt: new Date().toISOString(),
    }
    this.redirects.set(oldSlug, redirect)
    return redirect
  }

  static getRedirect(oldSlug: string): ContentSlugRedirectEntity | undefined {
    return this.redirects.get(oldSlug)
  }
}
