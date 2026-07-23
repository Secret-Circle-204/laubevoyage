import type { PaginationDTO } from '../shared/pagination-dto'

export interface BlogArticleDTO {
  id: number
  slug: string
  title: string
  summary: string
  contentHtml?: string
  authorName: string
  authorAvatarUrl?: string
  category: string
  publishedAt: string
  readTimeMinutes: number
  featuredImageUrl: string
}

export interface BlogCatalogDTO {
  articles: BlogArticleDTO[]
  categories: string[]
  featuredArticle?: BlogArticleDTO
  pagination: PaginationDTO
}

export interface FaqItemDTO {
  id: number
  question: string
  answer: string
  category: string
}

export interface FaqPageDTO {
  categories: string[]
  items: FaqItemDTO[]
}
