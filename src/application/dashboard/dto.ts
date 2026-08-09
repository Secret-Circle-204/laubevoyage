import type { ConvertedPrice } from '@/domains/currency/types'
import { LoyaltyTier } from '@/types'

export interface CustomerBookingCardDTO {
  id: number
  reference: string
  experienceTitle: string
  experienceImage: string
  departureDate: string
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  passengersCount: number
  totalCost: ConvertedPrice
}

export interface LoyaltyRedemptionRateDTO {
  pointsUnit: number
  baseValue: number
  baseCurrency: string
  displayValue: string // e.g. "€0.18" or "10.00 EGP"
}

export interface LoyaltyTierThresholdDTO {
  tier: LoyaltyTier
  minSpentEGP: number
  formattedMinSpent: string // e.g. "5,000 EGP" or localized currency
}

export interface CustomerPortalOverviewDTO {
  customerId: number
  fullName: string
  email: string
  currentTier: 'explorer' | 'voyager' | 'elite'
  points: number
  formattedPoints: string // Canonical localized points balance
  nextTierProgressPercent: number
  currentQualifyingSpendEGP: number
  remainingQualifyingSpendEGP: number | null
  formattedRemainingQualifyingSpend: string | null
  nextTierName: string
  activeBookingsCount: number
  recentBookings: CustomerBookingCardDTO[]
  unreadNotificationsCount: number
  passportNumber?: string
  nationality?: string
  tierThresholds: LoyaltyTierThresholdDTO[]
  redemptionRate: LoyaltyRedemptionRateDTO
}

export interface CustomerNotificationItemDTO {
  id: string
  title: string
  text: string
  time: string
  unread: boolean
  templateId: string
}

