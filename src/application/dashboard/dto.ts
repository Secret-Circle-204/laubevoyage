import type { ConvertedPrice } from '@/domains/currency/types'
import { LoyaltyTier, type BookingStatus } from '@/types'

export interface CustomerBookingCardDTO {
  id: number
  reference: string
  experienceTitle: string
  experienceImage: string
  departureDate: string
  status: BookingStatus
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

export interface PointsValueGuideDTO {
  title: string
  description: string
  unitText: string
}

export interface CustomerPortalOverviewDTO {
  customerId: number
  fullName: string
  email: string
  currentTier: LoyaltyTier
  points: number
  formattedPoints: string // Canonical localized points balance
  pointsMonetaryValue: ConvertedPrice
  pointsValuesAllCurrencies: ConvertedPrice[]
  pointsValueGuide: PointsValueGuideDTO
  nextTierProgressPercent: number
  totalSpentEGP: number
  formattedTotalSpentEGP: string
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

export interface CustomerSidebarDTO {
  customerId: number
  fullName: string
  currentTier: LoyaltyTier
}

export interface CustomerNotificationItemDTO {
  id: string
  title: string
  text: string
  time: string
  category: string
  unread: boolean
  templateId: string
}

export interface CustomerNotificationsPortalDTO {
  notifications: CustomerNotificationItemDTO[]
  total: number
  page: number
  totalPages: number
  limit: number
  currentCategory?: string
}

export interface CustomerBookingsHistoryDTO {
  bookings: CustomerBookingCardDTO[]
  total: number
  page: number
  totalPages: number
  limit: number
  currentStatus?: string
}




