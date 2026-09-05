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
  experienceType?: 'package' | 'daily_tour'
  url: string
  imageUrl: string
  price?: ConvertedPrice
  rating?: number
}

export interface GlobalSearchLabelsDTO {
  badge: string
  title: string
  resultsForQuery: string
  resultsAll: string
  placeholder: string
  searchButton: string
  filterAll: string
  filterPackages: string
  filterDailyTours: string
  emptyTitle: string
  emptyDescription: string
  emptyAction: string
  exploreItem: string
  previousPage: string
  nextPage: string
  pageOf: string
  showingCount: string
}

export interface GlobalSearchPageDTO {
  query: string
  activeCategory?: string
  totalResults: number
  items: GlobalSearchResultItemDTO[]
  facets: {
    categories: string[]
    minPrice: number
    maxPrice: number
  }
  pagination: PaginationDTO
  labels: GlobalSearchLabelsDTO
}

