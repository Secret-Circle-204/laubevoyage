import type { PaginationDTO } from '../shared/pagination-dto'

export interface GlobalSearchQueryDTO {
  query?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  page?: number
  limit?: number
  locale?: string
  currency?: string
}

import type { ConvertedPrice } from '@/domains/currency/types'

export interface GlobalSearchResultItemDTO {
  id: number
  title: string
  subtitle: string
  type: 'experience' | 'destination' | 'article'
  url: string
  imageUrl: string
  price?: ConvertedPrice
  rating?: number
}

export interface GlobalSearchPageDTO {
  query: string
  totalResults: number
  items: GlobalSearchResultItemDTO[]
  facets: {
    categories: string[]
    minPrice: number
    maxPrice: number
  }
  pagination: PaginationDTO
}
