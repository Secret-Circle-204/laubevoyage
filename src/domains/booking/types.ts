import type { BookingStatus, CurrencyCode } from '@/types'
import type { BookableDeparture } from '../experience/bookable-departure'

export type BookingSource = 'website' | 'admin' | 'api' | 'partner' | 'affiliate'

export interface Actor {
  id: number | string
  type: 'customer' | 'admin' | 'system'
  name?: string
  ipAddress?: string
  userAgent?: string
}

export interface TravelerInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth?: string
  passportNumber?: string
  type?: 'adult' | 'child' | 'infant'
}

export interface CapacityHoldEntity {
  holdId: string
  bookingId: number
  customerId: number
  experienceId: number
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
  provider: 'stripe' | 'bnpl' | 'manual'
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
}

export interface BookingAggregate {
  id: number
  bookingNumber: string
  version: number
  source: BookingSource
  status: BookingStatus
  customerId: number
  experienceId: number
  travelers: TravelerInput[]
  startDate: string
  endDate: string
  
  pricingSnapshot: PricingSnapshotData
  capacityHold: CapacityHoldEntity | null
  pointHold: PointHoldEntity | null
  
  pointsEarned: number
  paymentId?: string
  notes?: string
  
  paymentAttempts: PaymentAttempt[]
  timeline: CustomerTimelineEntry[]
  auditTrail: SystemAuditEntry[]
  documents: BookingDocumentReferences
  
  createdAt: string
  updatedAt: string
}

export interface CreateBookingParams {
  userId: number
  departure: BookableDeparture
  travelers: TravelerInput[]
  endDate: string
  pointsToRedeem?: number
  currency?: CurrencyCode
  source: BookingSource
  actor?: Actor
}


export interface PolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}
