import { BookingStatus, type CurrencyCode } from '@/types'
import type { BookableDeparture } from '../experience/bookable-departure'

export { BookingStatus }
export type { CurrencyCode }

export type BookingSource = 'website' | 'admin' | 'api' | 'partner' | 'affiliate'

export type BookingPaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'refunded'
  | 'partially_refunded'
  | 'written_off'

export interface Actor {
  id: number | string
  type: 'customer' | 'admin' | 'system'
  name?: string
  ipAddress?: string
  userAgent?: string
}

export interface TravelerInput {
  travelerId?: number
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  passportNumber?: string
  nationality?: string
  type?: 'adult' | 'child' | 'infant'
}

export interface TravelerManifestFieldIssue {
  travelerIndex: number
  travelerNumber: number
  travelerType: 'adult' | 'child' | 'infant'
  field: 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth' | 'nationality' | 'passportNumber'
  code: string
  message: string
}

export interface CustomerCompanionTravelerProjection {
  id: string
  bookingId: number
  bookingNumber: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  passportNumber?: string
}

export interface ManifestDiagnostics {
  valid: boolean
  totalExpected: number
  totalProvided: number
  issues: TravelerManifestFieldIssue[]
  travelerIssuesMap: Record<number, TravelerManifestFieldIssue[]>
}

export interface CapacityHoldEntity {
  holdId: string
  bookingId: number
  customerId: number
  experienceId: number
  departureId?: string
  departureSlotId?: number
  seats: number
  date: string
  createdAt: string
  expiresAt: string
  status: 'active' | 'committed' | 'released' | 'expired'
}

export interface PointHoldEntity {
  holdId: string
  bookingId: number
  customerId: number
  pointsHeld: number
  valueEGP: number
  createdAt: string
  expiresAt: string
  status: 'held' | 'committed' | 'released' | 'expired'
}

export interface PaymentAttempt {
  attemptId: string
  attemptNumber: number
  provider: 'stripe' | 'bnpl' | 'manual' | 'points' | 'invoice'
  amount: number
  currency: string
  status: 'initiated' | 'successful' | 'failed' | 'timed_out'
  transactionReference?: string
  failureReason?: string
  timestamp: string
}

export interface CustomerTimelineEntry {
  stepKey: string
  title: string
  description: string
  timestamp: string
  icon?: string
}

export interface SystemAuditEntry {
  auditId: string
  actor: Actor
  action: string
  reason?: string
  previousValue?: string
  newValue?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export interface BookingDocumentReferences {
  invoiceUrl?: string
  voucherUrl?: string
  receiptUrl?: string
  confirmationPdfUrl?: string
}

export interface CommercialSnapshotBreakdown {
  adultsCount: number
  adultBasePriceEGP: number
  adultsTotalEGP: number

  requestedRooms?: number
  effectiveRoomCount?: number
  minimumRequiredRooms?: number
  roomAllocation: Array<{
    roomIndex: number
    occupancy: 'single' | 'double' | 'triple' | 'quad'
    adults: number
    children: number
  }>
  roomCount: number
  autoAdjusted?: boolean
  adjustmentMessage?: string
  accommodationTotalEGP: number

  children?: Array<{
    age: number
    category: 'infant' | 'child'
    beddingMode: 'sharing_bed' | 'extra_bed'
    appliedPercentage: number
    priceEGP: number
  }>
  childrenTotalEGP: number

  staysBreakdown?: Array<{
    order: number
    optionId?: string
    propertyId: number
    propertyName: string
    nights: number
    roomCategory?: string
    boardBasis?: 'bed_and_breakfast' | 'half_board' | 'full_board' | 'all_inclusive'
    pricingUnit: 'per_stay' | 'per_night'
    appliedRoomRates: Array<{
      roomIndex: number
      occupancy: 'single' | 'double' | 'triple' | 'quad'
      pricingUnit: 'per_stay' | 'per_night'
      nights: number
      unitRateEGP: number
      rateEGP: number
      nightsMultiplier: number
      totalRoomCostEGP: number
    }>
    stayAccommodationTotalEGP: number
  }>
}

export interface PricingSnapshotData {
  version: number
  pricingVersion: number
  basePriceEGP: number
  promotionDiscountEGP: number
  couponDiscountEGP: number
  loyaltyDiscountEGP: number
  subtotalEGP: number
  taxes: number
  fees: number
  totalAmountEGP: number
  displayCurrency: CurrencyCode
  displayAmount: number
  exchangeRate: number
  exchangeProvider?: string
  exchangeRateTimestamp?: string
  roundingStrategy?: string
  currencyDecimals?: number
  commercialBreakdown?: CommercialSnapshotBreakdown
}

export interface BookingPickupLocation {
  label: string
  address: string
  latitude: number
  longitude: number
  instructions?: string
  source?: 'map' | 'search' | 'current_location' | 'fixed_meeting_point'
}

export interface BookingAggregate {
  id: number
  bookingNumber: string
  version: number
  source: BookingSource
  status: BookingStatus
  customerId: number
  experienceId: number
  departureSlot?: number
  travelers: TravelerInput[]
  startDate: string
  endDate: string
  completionAt: string
  paymentWindowExpiresAt: string
  destinationTimezone?: string
  pickupLocation?: BookingPickupLocation | null
  
  pricingSnapshot: PricingSnapshotData
  capacityHold: CapacityHoldEntity | null
  pointHold: PointHoldEntity | null
  
  paymentStatus?: BookingPaymentStatus
  amountPaid?: number
  outstandingBalance?: number
  
  pointsEarned: number
  paymentId?: string
  notes?: string
  
  paymentAttempts: PaymentAttempt[]
  timeline: CustomerTimelineEntry[]
  auditTrail: SystemAuditEntry[]
  documents: BookingDocumentReferences
  metadata?: Record<string, unknown>
  idempotencyKey?: string
  createdAt: string
  updatedAt: string
}

export interface CreateBookingParams {
  userId: number
  departure: BookableDeparture
  travelers: TravelerInput[]
  endDate: string
  completionAt?: string
  pointsToRedeem?: number
  currency?: CurrencyCode
  source: BookingSource
  actor?: Actor
  idempotencyKey?: string
  pricingSnapshot?: PricingSnapshotData
  commercialBreakdown?: CommercialSnapshotBreakdown
  requestedRooms?: number
  pickupLocation?: BookingPickupLocation | null
}


export interface PolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}

export interface CustomerTripSummary {
  activeBookingsCount: number
  upcomingCount: number
  latestBookingNumber?: string
  nextDepartureDate?: string
}

export interface BookingUserFilter {
  status?: BookingStatus | BookingStatus[]
  statusNotIn?: BookingStatus[]
  paymentStatus?: BookingPaymentStatus | BookingPaymentStatus[]
  paymentStatusNotIn?: BookingPaymentStatus[]
  or?: Array<Record<string, unknown>>
}

import type { GatewaySessionExpirationOutcome } from '../payment/types'

/**
 * Gate 3A: Minimal type-safe boundary for decoupled post-commit gateway session cleanup
 */
export interface IBookingPaymentGatewayCleanup {
  expireSessionForBooking(bookingId: number): Promise<{
    attempted: boolean
    outcome?: GatewaySessionExpirationOutcome
    sessionId?: string
    errorDetails?: string
  }>
}



