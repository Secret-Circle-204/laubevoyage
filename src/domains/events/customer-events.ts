import type { BaseDomainEvent } from './event-bus'

export interface CustomerRegisteredEvent extends BaseDomainEvent {
  type: 'CUSTOMER_REGISTERED'
  customerId: number
  email: string
  fullName: string
  status: string
}

export interface CustomerEmailVerifiedEvent extends BaseDomainEvent {
  type: 'CUSTOMER_EMAIL_VERIFIED'
  customerId: number
  email: string
  verifiedAt: string
}

export interface CustomerStatusUpdatedEvent extends BaseDomainEvent {
  type: 'CUSTOMER_STATUS_UPDATED'
  customerId: number
  oldStatus: string
  newStatus: string
  reason?: string
}

export interface CustomerUpdatedEvent extends BaseDomainEvent {
  type: 'CUSTOMER_UPDATED'
  customerId: number
  email?: string
  fullName?: string
  status?: string
}

export type CustomerDomainEvent =
  | CustomerRegisteredEvent
  | CustomerEmailVerifiedEvent
  | CustomerStatusUpdatedEvent
  | CustomerUpdatedEvent
