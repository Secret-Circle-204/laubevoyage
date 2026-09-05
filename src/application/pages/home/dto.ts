import type { ConvertedPrice } from '@/domains/currency/types'
import type { DestinationOptionDTO } from '@/application/experience/dto'

export interface HomeHeroDTO {
  title: string
  subtitle: string
  backgroundImageUrl: string
  ctaExploreText?: string
  ctaDiscoverText?: string
  destinations?: DestinationOptionDTO
}


export interface HomeFeaturedExperienceDTO {
  id: number
  slug: string
  title: string
  subtitle: string
  type: 'package' | 'daily_tour'
  imageUrl: string
  location: string
  durationDays: number
  rating: number
  reviewsCount: number
  price: ConvertedPrice
}

export interface HomeDestinationCardDTO {
  id: number
  countryName: string
  cityName: string
  countrySlug: string
  citySlug: string
  imageUrl: string
  experiencesCount: number
}

export interface HomeDTO {
  hero: HomeHeroDTO
  featuredExperiences: HomeFeaturedExperienceDTO[]
  topDestinations: HomeDestinationCardDTO[]
  stats: {
    happyTravelers: number
    destinationsCount: number
    toursCompleted: number
    satisfactionRate: number
  }
}
