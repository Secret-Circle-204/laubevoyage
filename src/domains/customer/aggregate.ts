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
  version: number

  createdAt: string
  updatedAt: string
}
