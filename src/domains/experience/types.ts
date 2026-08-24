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
  countryId?: number
  cityId?: number
  type?: ExperienceType
  tags?: string[]
  minDurationDays?: number
  maxDurationDays?: number
  minPriceEGP?: number
  maxPriceEGP?: number
  departureDate?: string
  availability?: ExperienceAvailabilityStatus
}
