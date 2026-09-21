import type { ConvertedPrice } from '@/domains/currency/types'
import type { ScheduleConfig, DepartureSlotStatus } from '@/domains/experience/types'

export type { ScheduleConfig, DepartureSlotStatus }

export interface DepartureSlotDTO {
  id: number
  departureId: string
  departureDate: string
  startTime?: string
  availableSeats: number
  totalCapacity?: number
  heldSeats?: number
  soldSeats?: number
  priceOverrideEGP?: number
  status: DepartureSlotStatus
}

export interface ItineraryDayDTO {
  dayNumber: number
  title: string
  description: string
  location?: string
  cityId?: number
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

export interface FormattedCommercialBreakdown {
  adultBasePrice: ConvertedPrice
  adultsTotalPrice: ConvertedPrice
  accommodationTotalPrice: ConvertedPrice
  childrenTotalPrice: ConvertedPrice
  children: Array<{
    age: number
    category: 'infant' | 'child'
    beddingMode: 'sharing_bed' | 'extra_bed'
    appliedPercentage: number
    price: ConvertedPrice
  }>
  staysBreakdown?: Array<{
    order: number
    optionId?: string
    propertyName: string
    nights: number
    roomCategory?: string
    boardBasis?: string
    pricingUnit: 'per_stay' | 'per_night'
    stayAccommodationTotalPrice: ConvertedPrice
    appliedRoomRates: Array<{
      roomIndex: number
      occupancy: 'single' | 'double' | 'triple' | 'quad'
      pricingUnit: 'per_stay' | 'per_night'
      nights: number
      unitRatePrice: ConvertedPrice
      totalRoomCostPrice: ConvertedPrice
    }>
  }>
}

export interface RoomRateDTO {
  occupancy: 'single' | 'double' | 'triple' | 'quad'
  label: string
  rateEGP: number
  ratePrice?: ConvertedPrice
  enabled: boolean
}

export interface AccommodationOptionDTO {
  id: string
  propertyId: number
  propertyName: string
  propertyType: string
  rating?: number
  heroUrl?: string
  roomCategory?: string
  boardBasis?: string
  pricingUnit: 'per_stay' | 'per_night'
  isDefault?: boolean
  roomRates: RoomRateDTO[]
}

export interface AccommodationStayDTO {
  order: number
  nights: number
  options: AccommodationOptionDTO[]
}

export interface ChildPolicyDTO {
  childrenAllowed: boolean
  childSharingBedPercentage: number
  childExtraBedPercentage: number
  childSharingPrice?: ConvertedPrice
  childExtraBedPrice?: ConvertedPrice
}

export interface DestinationStopDTO {
  id: number
  name: string
  slug: string
  countryName: string
  countrySlug: string
  imageUrl?: string
}

export interface BaseExperienceDetailsDTO {
  id: number
  slug: string
  title: string
  subtitle: string
  location: string
  destinations?: DestinationStopDTO[]
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
    formattedBreakdown?: FormattedCommercialBreakdown
    commercialBreakdown?: any
    availableAllocationOptions?: import('@/domains/experience/room-allocation-policy').RoomAllocationOption[]
    selectedAllocationId?: string
    selectedAccommodationOptions?: Record<number, string>
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
  accommodations?: AccommodationStayDTO[]
  childPolicy?: ChildPolicyDTO
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
  accommodations?: AccommodationStayDTO[]
  childPolicy?: ChildPolicyDTO
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

