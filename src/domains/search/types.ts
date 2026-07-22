export interface SearchQueryDTO {
  keyword?: string
  countryId?: number
  cityId?: number
  category?: string
  minPriceEGP?: number
  maxPriceEGP?: number
  durationDays?: number
  minRating?: number
  startDate?: string
  endDate?: string
  passengersCount?: number
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'popularity'
  page?: number
  limit?: number
}

export interface SearchFacetItemDTO {
  label: string
  value: string | number
  count: number
}

export interface SearchFacetsDTO {
  priceRange: { min: number; max: number }
  durations: SearchFacetItemDTO[]
  categories: SearchFacetItemDTO[]
  countries: SearchFacetItemDTO[]
  cities: SearchFacetItemDTO[]
  ratings: SearchFacetItemDTO[]
}

export interface SearchResultItemDTO {
  experienceId: number
  title: string
  slug: string
  countryName: string
  cityName: string
  category: string
  durationDays: number
  priceEGP: number
  rating: number
  reviewCount: number
  thumbnailUrl: string
  availableSeats: number
}

export interface SearchResponseDTO {
  items: SearchResultItemDTO[]
  totalItems: number
  totalPages: number
  currentPage: number
  facets: SearchFacetsDTO
  executionTimeMs: number
}

export interface SearchPolicyResult {
  valid: boolean
  reason?: string
}
