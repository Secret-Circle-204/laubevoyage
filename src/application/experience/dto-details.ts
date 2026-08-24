import type { ConvertedPrice } from '@/domains/currency/types'
import type { ScheduleConfig, DepartureSlotStatus } from '@/domains/experience/types'

export interface DepartureSlotDTO {
  id: number
  departureId: string
  departureDate: string
  startTime?: string
  availableSeats: number
  priceOverrideEGP?: number
  status: DepartureSlotStatus
}

export interface ItineraryDayDTO {
  dayNumber: number
  title: string
  description: string
  includedMeals?: string[]
}

export interface FixedPackageBookability {
  model: 'fixed_package'
  isBookable: boolean
  departureSlots: DepartureSlotDTO[]
  defaultSlotId: number | null
}

export interface FlexiblePackageBookability {
  model: 'flexible_package'
  isBookable: boolean
  initialSuggestedStartDate: string
  minStartDate: string
  durationDays: number
  durationNights?: number
  blackouts: Array<{ date: string; startTime?: string; reason?: string }>
}

export interface DailyTourBookability {
  model: 'daily_tour'
  isBookable: boolean
  initialSuggestedDate: string | null
  initialSuggestedTime: string | null
  minDate: string
  durationMinutes: number
  schedules: ScheduleConfig[]
  blackouts: Array<{ date: string; startTime?: string; reason?: string }>
}

export interface BaseExperienceDetailsDTO {
  id: number
  slug: string
  title: string
  subtitle: string
  location: string
  destinationTimezone: string
  rating: number
  reviewsCount: number
  initialAdults: number
  descriptionHtml: string
  images: string[]
  itinerary: ItineraryDayDTO[]
  includedServices: string[]
  excludedServices: string[]
  policiesHtml?: string
  pricing: {
    unitPrice: ConvertedPrice
    totalPrice: ConvertedPrice
  } | null
}

export interface FixedPackageDetailsDTO extends BaseExperienceDetailsDTO {
  type: 'package'
  packageMode: 'fixed_date'
  bookability: FixedPackageBookability
  durationDays: number
  durationNights?: number
  formattedDuration: string
  departureSlots: DepartureSlotDTO[]
  defaultSlotId: number | null
  blackouts: Array<{ date: string; startTime?: string; reason?: string }>
  schedules?: never
}

export interface FlexiblePackageDetailsDTO extends BaseExperienceDetailsDTO {
  type: 'package'
  packageMode: 'flexible_date'
  bookability: FlexiblePackageBookability
  durationDays: number
  durationNights?: number
  formattedDuration: string
  departureSlots: DepartureSlotDTO[] // empty array []
  defaultSlotId: null
  blackouts: Array<{ date: string; startTime?: string; reason?: string }>
  schedules?: never
}

export interface DailyTourDetailsDTO extends BaseExperienceDetailsDTO {
  type: 'daily_tour'
  packageMode?: never
  bookability: DailyTourBookability
  departureSlots: DepartureSlotDTO[] // empty array []
  defaultSlotId: null
  schedules: ScheduleConfig[]
  blackouts: Array<{ date: string; startTime?: string; reason?: string }>
  durationDays?: never
  durationNights?: never
  durationMinutes: number
  formattedDuration: string
}

export type PackageDetailsDTO = FixedPackageDetailsDTO | FlexiblePackageDetailsDTO
export type ExperienceDetailsDTO = FixedPackageDetailsDTO | FlexiblePackageDetailsDTO | DailyTourDetailsDTO
