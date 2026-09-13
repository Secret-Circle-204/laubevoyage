import type { HomeFeaturedExperienceDTO } from '../pages/home/dto'

export interface CountryDTO {
  id: number
  name: string
  slug: string
  description: string
  bannerUrl: string
  citiesCount: number
  experiencesCount: number
}

export interface CityDTO {
  id: number
  name: string
  slug: string
  countryName: string
  countrySlug: string
  description: string
  bannerUrl: string
  experiencesCount: number
}

export interface DestinationsCatalogDTO {
  countries: CountryDTO[]
  cities: CityDTO[]
  countriesPagination: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  pagination: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}



export interface CountryDetailsDTO {
  country: CountryDTO
  cities: CityDTO[]
  pagination?: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface CityExperiencesDTO {
  city: CityDTO
  country: CountryDTO
  experiences: HomeFeaturedExperienceDTO[]
  pagination?: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
