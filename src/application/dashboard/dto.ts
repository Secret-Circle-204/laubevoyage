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

export interface CustomerPortalOverviewLabelsDTO {
  personalTravelHome: string
  welcomeBack: string
  welcomeSubtitle: string
  primaryVoyageDossier: string
  statusConfirmed: string
  statusPendingReview: string
  viewDetails: string
  hideDetails: string
  details: string
  departure: string
  settlement: string
  accessTravelDossier: string
  schedule: string
  manifest: string
  travelerSingle: string
  travelerMultiple: string
  tourType: string
  type: string
  paymentStatus: string
  standardSchedule: string
  signatureTour: string
  noActiveReservations: string
  noActiveReservationsDesc: string
  exploreCuratedExperiences: string
  travelWalletTitle: string
  tierSuffix: string
  points: string
  pointsValue: string
  loyaltyHubBtn: string
  totalSpend: string
  spendToNextTier: string
  activeItineraries: string
  voyageSingle: string
  voyageMultiple: string
  recentReservationsTitle: string
  viewAll: string
  noBookingsFound: string
  noBookingsFoundDesc: string
  exploreExperiencesBtn: string
  settlementStatus: string
  fullySettled: string
  partiallyPaid: string
  pending: string
  balanceDue: string
}

export interface CustomerPortalOverviewDTO {
  customerId: number
  fullName: string
  email: string
  currentTier: LoyaltyTier
  translatedCurrentTier: string
  formattedCurrentTier: string
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
  uiLabels: CustomerPortalOverviewLabelsDTO
}

export interface CustomerSidebarDTO {
  customerId: number
  fullName: string
  currentTier: LoyaltyTier
  formattedTier: string
  navLinks: Array<{ label: string; href: string; icon: string }>
  tierSuffix: string
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

export interface BookingPickupLocationDTO {
  label: string
  address: string
  latitude: number
  longitude: number
  instructions?: string
  source?: string
}

export interface BookingTravelerDTO {
  firstName: string
  lastName: string
  type: 'adult' | 'child' | 'infant'
  isLead: boolean
  email?: string
  phone?: string
  nationality?: string
  passportMasked?: string
}

export interface BookingStaySnapshotDTO {
  order: number
  propertyName: string
  nights: number
  roomCategory?: string
}

export interface BookingRoomAllocationDTO {
  roomIndex: number
  occupancy: 'single' | 'double' | 'triple' | 'quad'
  adults: number
  children: number
}

export interface BookingDetailsDTO {
  bookingNumber: string
  experienceTitle: string
  experienceType: 'package' | 'daily_tour'
  departureDate: string
  endDate?: string
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
  pickupLocation?: BookingPickupLocationDTO | null
  travelers: BookingTravelerDTO[]
  stays: BookingStaySnapshotDTO[]
  roomAllocation: BookingRoomAllocationDTO[]
}
