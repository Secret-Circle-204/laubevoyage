import type { ConvertedPrice } from '@/domains/currency/types'
import { LoyaltyTier, type BookingStatus } from '@/types'
import type { BookingPaymentStatus } from '@/domains/booking/types'
import type { PointHoldStatus } from '@/domains/loyalty/types'

export interface CustomerBookingCardDTO {
  id: number
  reference: string
  experienceTitle: string
  experienceImage: string
  productTypeLabel?: string
  destinationCity?: string
  durationText?: string
  departureDate: string
  departureTime?: string
  returnTime?: string
  endDate?: string
  destinationTimezone?: string
  status: BookingStatus
  passengersCount: number
  totalCost: ConvertedPrice
  paymentStatus?: BookingPaymentStatus
  paidAmount?: ConvertedPrice
  outstandingBalance?: ConvertedPrice
  isCancelled?: boolean
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

export type BookingRedemptionStatus =
  | 'none'
  | 'held'
  | 'redeemed'
  | 'partially_refunded'
  | 'refunded'
  | 'released'

export type BookingEarningStatus =
  | 'none'
  | 'pending'
  | 'credited'
  | 'partially_reversed'
  | 'reversed'

export interface BookingLoyaltySummaryDTO {
  pointsRedeemed: number
  discountPrice?: ConvertedPrice
  discountFromPointsEGP: number
  redemptionStatus: BookingRedemptionStatus
  pointsEarned: number
  earningStatus: BookingEarningStatus
  heldPoints: number
  holdStatus: PointHoldStatus | 'none'
}

export interface BookingDetailsDTO {
  bookingNumber: string
  experienceTitle: string
  departureDate: string
  passengersCount: number
  basePrice: ConvertedPrice
  totalCost: ConvertedPrice
  pointsEarned: number
  status: BookingStatus
  paymentStatus: BookingPaymentStatus
  paidAmount: ConvertedPrice
  outstandingBalance: ConvertedPrice
  rawPaidAmount: number
  rawOutstandingBalance: number
  rawTotalCost: number
  loyaltySummary: BookingLoyaltySummaryDTO
}
