import { LoyaltyTier } from '@/types'
import type { BaseDomainEvent } from './event-bus'

export interface LoyaltyEarnedEvent extends BaseDomainEvent {
  type: 'LOYALTY_EARNED'
  customerId: number
  points: number
  balance: number
  bookingId?: number
}

export interface PointsRedeemedEvent extends BaseDomainEvent {
  type: 'POINTS_REDEEMED'
  customerId: number
  points: number
  balance: number
  bookingId?: number
}

export interface PointsRefundedEvent extends BaseDomainEvent {
  type: 'POINTS_REFUNDED'
  customerId: number
  points: number
  balance: number
  bookingId?: number
}

export interface TierUpgradedEvent extends BaseDomainEvent {
  type: 'TIER_UPGRADED'
  customerId: number
  newTier: LoyaltyTier
  bonusGranted: number
}

export interface ManualAdjustmentEvent extends BaseDomainEvent {
  type: 'MANUAL_ADJUSTMENT'
  customerId: number
  points: number
  balance: number
  ticket: string
  adminId: number | string
}

export type LoyaltyDomainEvent =
  | LoyaltyEarnedEvent
  | PointsRedeemedEvent
  | PointsRefundedEvent
  | TierUpgradedEvent
  | ManualAdjustmentEvent
