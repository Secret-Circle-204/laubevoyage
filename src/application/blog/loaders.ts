import { getDomainServices } from '@/domains/factory'
import type { BlogCatalogDTO, BlogArticleDTO, FaqPageDTO } from './dto'

export class BlogCatalogLoader {
  static async load(params?: { page?: number; limit?: number; category?: string; locale?: string }): Promise<BlogCatalogDTO> {
    const page = params?.page || 1
    const limit = params?.limit || 9

    try {
      const { content, localization } = await getDomainServices()
      const ctx = await localization.buildContext({ cookieLocale: params?.locale })
      const articlesRes = await content.getBlogArticles(params)

      const rawTexts: string[] = []
      for (const doc of articlesRes.docs || []) {
        rawTexts.push(String(doc.title || ''))
        rawTexts.push(String((doc as any).summary || (doc as any).excerpt || ''))
      }

      const translatedTexts = await localization.translateBatch(rawTexts, ctx)
      let idx = 0

      const articles: BlogArticleDTO[] = (articlesRes.docs || []).map((doc: any) => {
        const translatedTitle = translatedTexts[idx++] || String(doc.title || '')
        const translatedSummary = translatedTexts[idx++] || String(doc.summary || '')

        return {
          id: Number(doc.id),
          slug: doc.slug || '',
          title: translatedTitle,
          summary: translatedSummary,
          category: doc.category || '',
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString() : '',
          readTimeMinutes: doc.readTimeMinutes || 5,
          featuredImageUrl: doc.featuredImage?.url || '',
          authorName: typeof doc.author === 'object' ? doc.author?.name : '',
        }
      })

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
    } catch (err) {
      console.error('[BlogCatalogLoader] Failed loading blog catalog:', err)
      throw err
    }
  }
}

export class ArticleLoader {
  static async loadBySlug(slug: string, options?: { locale?: string }): Promise<BlogArticleDTO | null> {
    try {
      const { content, localization } = await getDomainServices()
      const ctx = await localization.buildContext({ cookieLocale: options?.locale })
      const doc = (await content.getArticleBySlug(slug)) as any
      if (!doc) return null

      const rawTitle = String(doc.title || '')
      const rawSummary = String(doc.summary || '')
      const rawContent = String(doc.contentHtml || doc.content || doc.summary || '')

      const [translatedTitle, translatedSummary, translatedContent] = await localization.translateBatch(
        [rawTitle, rawSummary, rawContent],
        ctx,
      )

      return {
        id: Number(doc.id),
        slug: doc.slug,
        title: translatedTitle || rawTitle,
        summary: translatedSummary || rawSummary,
        contentHtml: translatedContent || rawContent,
        category: doc.category || '',
        publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString() : '',
        readTimeMinutes: doc.readTimeMinutes || 5,
        featuredImageUrl: doc.featuredImage?.url || '',
        authorName: typeof doc.author === 'object' ? doc.author?.name : '',
      }
    } catch (err) {
      console.error(`[ArticleLoader] Failed loading article with slug ${slug}:`, err)
      throw err
    }
  }
}

export class FaqLoader {
  static async load(options?: { locale?: string }): Promise<FaqPageDTO> {
    try {
      const { content, localization } = await getDomainServices()
      const ctx = await localization.buildContext({ cookieLocale: options?.locale })
      const faqsRes = await content.getFaqs()

      const rawTexts: string[] = []
      for (const doc of faqsRes.docs || []) {
        rawTexts.push(String(doc.question || ''))
        rawTexts.push(String(doc.answer || ''))
      }

      const translatedTexts = await localization.translateBatch(rawTexts, ctx)
      let idx = 0

      const items = (faqsRes.docs || []).map((doc: any) => {
        const translatedQuestion = translatedTexts[idx++] || String(doc.question || '')
        const translatedAnswer = translatedTexts[idx++] || String(doc.answer || '')

        return {
          id: Number(doc.id),
          question: translatedQuestion,
          answer: translatedAnswer,
          category: doc.category || '',
        }
      })

      const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)))

      return {
        categories,
        items,
      }
    } catch (err) {
      console.error('[FaqLoader] Failed loading FAQs:', err)
      throw err
    }
  }
}
