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
  featuredCities: CityDTO[]
}

export interface CountryDetailsDTO {
  country: CountryDTO
  cities: CityDTO[]
}

export interface CityExperiencesDTO {
  city: CityDTO
  country: CountryDTO
  experiences: HomeFeaturedExperienceDTO[]
}
