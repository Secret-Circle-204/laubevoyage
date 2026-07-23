import { getDomainServices } from '@/domains/factory'
import type { BlogCatalogDTO, BlogArticleDTO, FaqPageDTO } from './dto'

export class BlogCatalogLoader {
  static async load(params?: { page?: number; limit?: number; category?: string }): Promise<BlogCatalogDTO> {
    const page = params?.page || 1
    const limit = params?.limit || 9

    try {
      const { content } = await getDomainServices()
      const articlesRes = await content.getBlogArticles(params)

      const articles: BlogArticleDTO[] = (articlesRes.docs || []).map((doc: any) => ({
        id: Number(doc.id),
        slug: doc.slug || '',
        title: doc.title || '',
        summary: doc.summary || '',
        category: doc.category || '',
        publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString() : '',
        readTimeMinutes: doc.readTimeMinutes || 5,
        featuredImageUrl: doc.featuredImage?.url || '',
        authorName: typeof doc.author === 'object' ? doc.author?.name : '',
      }))

      const categories = Array.from(new Set(articles.map((a) => a.category).filter(Boolean)))

      return {
        articles,
        categories,
        featuredArticle: articles[0],
        pagination: {
          page: articlesRes.page || 1,
          limit: articlesRes.limit || 9,
          totalPages: articlesRes.totalPages || 0,
          totalItems: articlesRes.totalDocs || 0,
          hasNextPage: articlesRes.hasNextPage || false,
          hasPrevPage: articlesRes.hasPrevPage || false,
        },
      }
    } catch {
      return {
        articles: [],
        categories: [],
        featuredArticle: undefined,
        pagination: {
          page: 1,
          limit: 9,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
    }
  }
}

export class ArticleLoader {
  static async loadBySlug(slug: string): Promise<BlogArticleDTO | null> {
    try {
      const { content } = await getDomainServices()
      const doc = (await content.getArticleBySlug(slug)) as any
      if (!doc) return null

      return {
        id: Number(doc.id),
        slug: doc.slug,
        title: doc.title || '',
        summary: doc.summary || '',
        contentHtml: doc.contentHtml || doc.content || doc.summary || '',
        category: doc.category || '',
        publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString() : '',
        readTimeMinutes: doc.readTimeMinutes || 5,
        featuredImageUrl: doc.featuredImage?.url || '',
        authorName: typeof doc.author === 'object' ? doc.author?.name : '',
      }
    } catch {
      return null
    }
  }
}

export class FaqLoader {
  static async load(): Promise<FaqPageDTO> {
    try {
      const { content } = await getDomainServices()
      const faqsRes = await content.getFaqs()

      const items = (faqsRes.docs || []).map((doc: any) => ({
        id: Number(doc.id),
        question: doc.question || '',
        answer: doc.answer || '',
        category: doc.category || '',
      }))

      const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)))

      return {
        categories,
        items,
      }
    } catch {
      return {
        categories: [],
        items: [],
      }
    }
  }
}
