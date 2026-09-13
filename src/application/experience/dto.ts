import type { HomeFeaturedExperienceDTO } from '../pages/home/dto'
import type { PaginationDTO } from '../shared/pagination-dto'
import type { ParsedExperienceSearchParams } from '../shared/parsers/experience-search-parser'

export interface DestinationOptionDTO {
  countries: { id: number; name: string; slug: string }[]
  cities: { id: number; name: string; slug: string; countryId: number; countryName: string }[]
}

export interface BudgetPresetOption {
  egpValue: number
  displayLabel: string
}

export interface BudgetPresetsDTO {
  currencyCode: string
  currencySymbol: string
  minPresets: BudgetPresetOption[]
  maxPresets: BudgetPresetOption[]
}

export interface ExperienceCatalogDTO {
  filters: ParsedExperienceSearchParams
  experiences: HomeFeaturedExperienceDTO[]
  destinations: DestinationOptionDTO
  budgetPresets: BudgetPresetsDTO
  facets: {
    minPrice: number
    maxPrice: number
    categories: string[]
  }
  pagination: PaginationDTO
  labels: {
    badge: string
    title: string
    description: string
    filterAll: string
    filterPackages: string
    filterDailyTours: string
    viewItinerary: string
    packageLabel: string
    dailyTourLabel: string
  }
}


