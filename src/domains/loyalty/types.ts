import { LoyaltyTier } from '@/types'

export type LedgerEntryType =
  | 'earn'
  | 'earned'
  | 'redeem'
  | 'redeemed'
  | 'refund'
  | 'refunded'
  | 'reverse'
  | 'reversed'
  | 'welcome_bonus'
  | 'tier_bonus'
  | 'manual_adjustment'
  | 'expiration'
  | 'expired'

export type LedgerReferenceType =
  | 'booking'
  | 'admin_ticket'
  | 'system_welcome'
  | 'expiration_scan'

export interface PointLedgerRecord {
  id: string
  customerId: number
  ledgerVersion: number
  type: LedgerEntryType
  points: number // Positive for earn/bonus/refund; Negative for redeem/reverse/expiration
  resultingBalance: number
  referenceType?: LedgerReferenceType
  referenceId?: string
  earnedLedgerId?: string
  expiredByEntryId?: string
  reason: string
  bookingId?: number
  expiresAt?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export type PointHoldStatus = 'held' | 'committed' | 'released' | 'expired'

export interface PointHoldEntity {
  holdId: string
  bookingId: number
  customerId: number
  pointsHeld: number
  status: PointHoldStatus
  expiresAt: string
  createdAt: string
}

export interface TierHistoryRecord {
  tier: LoyaltyTier
  achievedAt: string
  bonusGranted: number
}

export interface LoyaltyAuditRecord {
  auditId: string
  actor: { id: number | string; type: 'customer' | 'admin' | 'system' }
  action: string
  reason?: string
  previousTier?: LoyaltyTier
  newTier?: LoyaltyTier
  pointsChanged: number
  resultingBalance: number
  timestamp: string
}

export interface AdminAdjustmentParams {
  customerId: number
  points: number
  adjustmentType: 'grant' | 'deduct' | 'compensation' | 'fraud_reversal'
  reason: string
  ticket: string
  adminId: number | string
  approvalId?: string
  notes?: string
}

export interface LoyaltyPolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}

export interface TierProgress {
  currentTier: LoyaltyTier
  nextTier: LoyaltyTier | null
  currentQualifyingSpendEGP: number
  nextTierMinSpentEGP: number | null
  remainingQualifyingSpendEGP: number | null
  percent: number
}

