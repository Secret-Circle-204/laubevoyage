import type { PriceDisplayViewModel } from '../../shared/view-models/price-display'

export interface HomeHeroDTO {
  title: string
  subtitle: string
  backgroundImageUrl: string
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
  price: PriceDisplayViewModel
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
