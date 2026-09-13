import type { BlackoutEntry } from './blackout-policy'

export type ExperienceType = 'package' | 'daily_tour'

export type PackageMode = 'fixed_date' | 'flexible_date'

export interface PackageDuration {
  days: number
  nights?: number
}

export interface DailyTourDuration {
  durationMinutes: number
}

export type ExperienceDuration =
  | ({ type: 'package' } & PackageDuration)
  | ({ type: 'daily_tour' } & DailyTourDuration)

export type ExperienceAvailabilityStatus = 'available' | 'sold_out' | 'coming_soon' | 'unavailable'

export type DepartureSlotStatus = 'available' | 'sold_out' | 'blacked_out' | 'cancelled' | 'past'

export type AccommodationType = 'hotel' | 'resort' | 'cruise' | 'lodge' | 'camp'

export type BoardBasis = 'bed_and_breakfast' | 'half_board' | 'full_board' | 'all_inclusive'

export type OccupancyType = 'single' | 'double' | 'triple' | 'quad'
export type PricingUnit = 'per_stay' | 'per_night'

export interface RoomRateEntity {
  occupancy: OccupancyType
  guestCount?: number
  rateEGP: number
  enabled: boolean
}

export interface AccommodationPropertyEntity {
  id: number
  name: string
  slug: string
  type: AccommodationType
  cityId: number
  rating?: number
  heroUrl?: string
  descriptionHtml?: string
  isActive: boolean
}

export interface ExperienceChildPolicy {
  childrenAllowed: boolean
  childSharingBedPercentage: number
  childExtraBedPercentage: number
}

export interface AccommodationStayEntity {
  order: number
  propertyId: number
  property?: AccommodationPropertyEntity
  nights: number
  roomCategory?: string
  boardBasis?: BoardBasis
  pricingUnit: PricingUnit
  roomRates: RoomRateEntity[]
}

export interface ItineraryDay {
  dayNumber: number
  title: string
  description: string
  cityId?: number
  cityName?: string
}

/**
 * Lightweight operational projection used for slot scheduling, capacity checks,
 * and operational administration without hydrating heavy sub-models.
 */
export interface ExperienceOperationalMetadata {
  id: number
  title: string
  slug: string
  /** Origin / Departure Gateway City ID (where the journey commences). */
  cityId: number
  /** Ordered Post-Origin Journey Destination City IDs (visited after departing Origin). */
  destinations?: number[]
  type: ExperienceType
  packageMode?: PackageMode
  durationDays: number
  durationMinutes?: number
  price: number
  availability: ExperienceAvailabilityStatus
  schedules?: ScheduleConfig[]
  version: number
  isActive: boolean
}

export interface PriceOverrideEntry {
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm (optional)
  priceEGP: number
  reason?: string
}

export interface ScheduleConfig {
  startTime: string
  defaultCapacity?: number
  label?: string
}

export interface DepartureSlotEntity {
  id?: number
  departureId: string
  experienceId: number
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm
  priceOverrideEGP?: number
  capacityTotal: number
  capacityReserved: number
  capacitySold: number
  capacityAvailable: number
  version: number // Optimistic locking
  blackoutReason?: string
  status: DepartureSlotStatus
}

export interface PricingContext {
  departureId: string
  experienceId: number
  customerId?: number
  displayCurrency: string
  couponCode?: string
  travelers: {
    adults: number
    children?: number
    seniors?: number
  }
  bookingDate: string
  residentStatus?: boolean
}

export interface PricingAuditStep {
  stepName: string
  amountChangeEGP: number
  reason: string
  resultingSubtotalEGP: number
}

export interface AvailabilityPolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}

export interface ExperienceSearchQueryParams {
  keyword?: string
  ids?: number[]
  countryId?: number
  cityId?: number
  type?: ExperienceType
  tags?: string[]
  minDurationDays?: number
  maxDurationDays?: number
  minDurationMinutes?: number
  maxDurationMinutes?: number
  minPriceEGP?: number
  maxPriceEGP?: number
  departureDate?: string
  availability?: ExperienceAvailabilityStatus
  isActive?: boolean
  page?: number
  limit?: number
  sort?: string
}

