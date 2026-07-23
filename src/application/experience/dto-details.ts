import type { PriceDisplayViewModel } from '../shared/view-models/price-display'

export interface DepartureSlotDTO {
  id: number
  departureDate: string
  availableSeats: number
  status: 'available' | 'limited' | 'sold_out'
}

export interface ItineraryDayDTO {
  dayNumber: number
  title: string
  description: string
  includedMeals?: string[]
}

export interface ExperienceDetailsDTO {
  id: number
  slug: string
  title: string
  subtitle: string
  type: 'package' | 'daily_tour'
  location: string
  durationDays: number
  rating: number
  reviewsCount: number
  basePrice: PriceDisplayViewModel
  descriptionHtml: string
  images: string[]
  itinerary: ItineraryDayDTO[]
  departureSlots: DepartureSlotDTO[]
  includedServices: string[]
  excludedServices: string[]
}
