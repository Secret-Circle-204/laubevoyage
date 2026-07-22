import { LoyaltyTier } from '@/types'
import type { TierHistoryRecord } from './types'

/**
 * Loyalty Aggregate Root
 * Single source of truth for customer loyalty aggregate domain state.
 * Contains scalar properties only (Zero unbounded historical arrays).
 */
export interface LoyaltyAggregate {
  customerId: number
  version: number
  tier: LoyaltyTier
  totalSpentEGP: number
  lastLedgerId?: string
  tierHistory: TierHistoryRecord[]
  createdAt: string
  updatedAt: string
}
