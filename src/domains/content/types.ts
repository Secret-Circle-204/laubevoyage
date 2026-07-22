export interface PageBlockEntity {
  blockId: string
  blockType: 'hero' | 'features' | 'testimonials' | 'gallery' | 'faq'
  title: string
  contentJson: Record<string, unknown>
}

export interface ContentSlugRedirectEntity {
  redirectId: string
  oldSlug: string
  newSlug: string
  statusCode: 301 | 302
  createdAt: string
}

export interface ContentPageEntity {
  pageId: string
  slug: string
  title: string
  status: 'draft' | 'published'
  blocks: PageBlockEntity[]
  seoTitle?: string
  seoDescription?: string
  ogImage?: string
  publishedAt?: string
}

export interface BlogPostEntity {
  postId: string
  slug: string
  title: string
  excerpt: string
  bodyHtml: string
  category: string
  tags: string[]
  authorName: string
  readTimeMinutes: number
  status: 'draft' | 'published'
  publishedAt?: string
}

export interface FaqItemEntity {
  faqId: string
  category: 'booking' | 'cancellation' | 'payment' | 'loyalty'
  question: string
  answer: string
  order: number
}

export interface ContentSearchResult {
  id: string
  title: string
  snippet: string
  slug: string
  type: 'page' | 'post' | 'faq'
}

export interface SeoMetadataDTO {
  title: string
  description: string
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  jsonLdSchema: string
}

export interface ContentPolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}
