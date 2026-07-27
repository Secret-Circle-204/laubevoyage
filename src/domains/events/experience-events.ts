import type { BaseDomainEvent } from './event-bus'

export interface PricingSnapshotCreatedEvent extends BaseDomainEvent {
  type: 'PRICING_SNAPSHOT_CREATED'
  snapshotId: string
  experienceId: number
  departureId: string
  basePriceEGP: number
  displayCurrency: string
  displayAmount: number
}

export interface InventoryReservedEvent extends BaseDomainEvent {
  type: 'INVENTORY_RESERVED'
  departureId: string
  experienceId: number
  seatsReserved: number
  holdId: string
}

export interface InventoryReleasedEvent extends BaseDomainEvent {
  type: 'INVENTORY_RELEASED'
  departureId: string
  experienceId: number
  seatsReleased: number
}

export type ExperienceDomainEvent =
  | PricingSnapshotCreatedEvent
  | InventoryReservedEvent
  | InventoryReleasedEvent
