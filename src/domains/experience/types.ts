export type ExperienceType = 'package' | 'daily_tour'

export type ExperienceAvailabilityStatus = 'available' | 'sold_out' | 'coming_soon' | 'unavailable'

export type DepartureSlotStatus = 'available' | 'sold_out' | 'blacked_out' | 'cancelled'

export interface DepartureSlotEntity {
  departureId: string
  experienceId: number
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm
  basePriceEGP: number
  capacityTotal: number
  capacityReserved: number
  capacitySold: number
  capacityAvailable: number
  version: number // Optimistic locking
  isBlackedOut: boolean
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
