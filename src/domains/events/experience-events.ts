export interface PricingSnapshotCreatedEvent {
  type: 'PRICING_SNAPSHOT_CREATED'
  eventVersion: 'v1'
  snapshotId: string
  experienceId: number
  departureId: string
  basePriceEGP: number
  displayCurrency: string
  displayAmount: number
  timestamp: string
}

export interface InventoryReservedEvent {
  type: 'INVENTORY_RESERVED'
  eventVersion: 'v1'
  departureId: string
  experienceId: number
  seatsReserved: number
  holdId: string
  timestamp: string
}

export interface InventoryReleasedEvent {
  type: 'INVENTORY_RELEASED'
  eventVersion: 'v1'
  departureId: string
  experienceId: number
  seatsReleased: number
  timestamp: string
}

export type ExperienceDomainEvent =
  | PricingSnapshotCreatedEvent
  | InventoryReservedEvent
  | InventoryReleasedEvent
