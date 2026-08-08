import type { CustomerStatus } from './types'

/**
 * Customer Aggregate Root
 * Single source of truth for end customer identity model.
 */
export interface CustomerAggregate {
  customerId: number
  email: string
  firstName: string
  lastName: string
  fullName: string
  phone?: string
  passportNumber?: string
  nationality?: string
  isEmailVerified: boolean
  isPhoneVerified: boolean
  status: CustomerStatus
  preferredCurrency: string
  preferredLanguage: string
  lastLoginAt?: string
  failedLoginAttempts: number
  lockedUntil?: string
  deletedAt?: string
  emailVerifiedAt?: string
  phoneVerifiedAt?: string
  loyalty?: { tier: string; points: number; totalSpentEGP: number; totalSpent?: number }
  notifications?: { email: boolean; sms: boolean; push: boolean }
  version: number

  createdAt: string
  updatedAt: string
}
