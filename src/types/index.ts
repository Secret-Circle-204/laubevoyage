// ============================================================================
// Core Domain Types - Single Source of Truth
// ============================================================================

// ============================================================================
// BOOKING DOMAIN
// ============================================================================

export enum BookingStatus {
  DRAFT = 'draft',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export type BookingTransition =
  | { from: BookingStatus.DRAFT; to: BookingStatus.PENDING_PAYMENT }
  | { from: BookingStatus.PENDING_PAYMENT; to: BookingStatus.PAID }
  | { from: BookingStatus.PAID; to: BookingStatus.CONFIRMED }
  | { from: BookingStatus.CONFIRMED; to: BookingStatus.COMPLETED }
  | { from: BookingStatus.PENDING_PAYMENT; to: BookingStatus.CANCELLED }
  | { from: BookingStatus.CONFIRMED; to: BookingStatus.CANCELLED }
  | { from: BookingStatus.PAID; to: BookingStatus.REFUNDED }
  | { from: BookingStatus.CONFIRMED; to: BookingStatus.REFUNDED }

// ============================================================================
// EXPERIENCE DOMAIN (DESTINATION)
// ============================================================================

export enum ExperienceType {
  PACKAGE = 'package',
  DAILY_TOUR = 'daily_tour',
}

export enum ExperienceAvailability {
  AVAILABLE = 'available',
  SOLD_OUT = 'sold_out',
  COMING_SOON = 'coming_soon',
  UNAVAILABLE = 'unavailable',
}

// ============================================================================
// PAYMENT DOMAIN
// ============================================================================

export enum PaymentProvider {
  STRIPE = 'stripe',
  BOOK_NOW_PAY_LATER = 'book_now_pay_later',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ============================================================================
// LOYALTY DOMAIN
// ============================================================================

export enum LoyaltyTier {
  EXPLORER = 'explorer',
  VOYAGER = 'voyager',
  ELITE = 'elite',
}

export enum PointTransactionType {
  EARNED = 'earned',
  REDEEMED = 'redeemed',
  REFUNDED = 'refunded',
  REVERSED = 'reversed',
  BONUS = 'bonus',
  EXPIRED = 'expired',
  TIER_UPGRADE = 'tier_upgrade',
  WELCOME_BONUS = 'welcome_bonus',
}

export interface PointLedgerEntry {
  id: string
  userId: string
  type: PointTransactionType
  amount: number // positive or negative
  balance: number // running balance after this transaction
  reason: string
  bookingId?: string
  createdAt: Date
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

// Tier Configuration
export const TIER_CONFIG = {
  [LoyaltyTier.EXPLORER]: {
    minSpent: 0,
    bonus: 0,
    earnRate: 1, // 1 point per EGP
  },
  [LoyaltyTier.VOYAGER]: {
    minSpent: 5000,
    bonus: 500,
    earnRate: 1.2,
  },
  [LoyaltyTier.ELITE]: {
    minSpent: 15000,
    bonus: 1000,
    earnRate: 1.5,
  },
} as const

export const WELCOME_BONUS = 100

// ============================================================================
// CURRENCY DOMAIN
// ============================================================================

export enum CurrencyCode {
  EGP = 'EGP', // Base currency
  USD = 'USD',
  EUR = 'EUR',
  AED = 'AED',
  SAR = 'SAR',
}

export interface ExchangeRate {
  from: CurrencyCode
  to: CurrencyCode
  rate: number
  lastUpdated: Date
}

export interface Money {
  amount: number
  currency: CurrencyCode
}

// ============================================================================
// USER DOMAIN
// ============================================================================

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

// ============================================================================
// NOTIFICATION DOMAIN
// ============================================================================

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
}

export enum NotificationTemplate {
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  LOYALTY_EARNED = 'loyalty_earned',
  LOYALTY_REDEEMED = 'loyalty_redeemed',
  TIER_UPGRADED = 'tier_upgraded',
  TRIP_REMINDER = 'trip_reminder',
  TRIP_COMPLETED = 'trip_completed',
}

// ============================================================================
// TRANSLATION DOMAIN
// ============================================================================

export enum Locale {
  EN = 'en',
  AR = 'ar',
  FR = 'fr',
}

export interface Translation {
  locale: Locale
  key: string
  value: string
  cached: boolean
  lastUpdated: Date
}

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  userId?: string
  changes?: Record<string, unknown>
  metadata?: Record<string, unknown>
  createdAt: Date
}
