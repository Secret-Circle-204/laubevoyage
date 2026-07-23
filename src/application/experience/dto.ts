import type { HomeFeaturedExperienceDTO } from '../pages/home/dto'
import type { PaginationDTO } from '../shared/pagination-dto'
import type { ParsedExperienceSearchParams } from '../shared/parsers/experience-search-parser'

export interface ExperienceCatalogDTO {
  filters: ParsedExperienceSearchParams
  experiences: HomeFeaturedExperienceDTO[]
  facets: {
    minPrice: number
    maxPrice: number
    categories: string[]
  }
  pagination: PaginationDTO
}
