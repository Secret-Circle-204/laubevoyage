import { LoyaltyTier } from '@/types'

export interface LoyaltyEarnedEvent {
  type: 'LOYALTY_EARNED'
  eventVersion: 'v1'
  customerId: number
  points: number
  balance: number
  bookingId?: number
  timestamp: string
}

export interface PointsRedeemedEvent {
  type: 'POINTS_REDEEMED'
  eventVersion: 'v1'
  customerId: number
  points: number
  balance: number
  bookingId?: number
  timestamp: string
}

export interface PointsRefundedEvent {
  type: 'POINTS_REFUNDED'
  eventVersion: 'v1'
  customerId: number
  points: number
  balance: number
  bookingId?: number
  timestamp: string
}

export interface TierUpgradedEvent {
  type: 'TIER_UPGRADED'
  eventVersion: 'v1'
  customerId: number
  newTier: LoyaltyTier
  bonusGranted: number
  timestamp: string
}

export interface ManualAdjustmentEvent {
  type: 'MANUAL_ADJUSTMENT'
  eventVersion: 'v1'
  customerId: number
  points: number
  balance: number
  ticket: string
  adminId: number | string
  timestamp: string
}

export type LoyaltyDomainEvent =
  | LoyaltyEarnedEvent
  | PointsRedeemedEvent
  | PointsRefundedEvent
  | TierUpgradedEvent
  | ManualAdjustmentEvent
