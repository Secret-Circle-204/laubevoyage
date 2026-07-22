import { LoyaltyTier } from '@/types'

/**
 * Loyalty Projection
 * Derived Read Model cached for fast UI rendering & point balance queries.
 * PointLedger is the absolute Source of Truth.
 */
export interface LoyaltyProjection {
  customerId: number
  balance: number
  tier: LoyaltyTier
  totalSpentEGP: number
  lastLedgerId: string
  version: number
  updatedAt: string
}
