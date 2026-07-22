export interface CustomerRegisteredEvent {
  type: 'CUSTOMER_REGISTERED'
  eventVersion: 'v1'
  customerId: number
  email: string
  fullName: string
  status: string
  timestamp: string
}

export interface CustomerEmailVerifiedEvent {
  type: 'CUSTOMER_EMAIL_VERIFIED'
  eventVersion: 'v1'
  customerId: number
  email: string
  verifiedAt: string
  timestamp: string
}

export interface CustomerStatusUpdatedEvent {
  type: 'CUSTOMER_STATUS_UPDATED'
  eventVersion: 'v1'
  customerId: number
  oldStatus: string
  newStatus: string
  timestamp: string
}

export type CustomerDomainEvent =
  | CustomerRegisteredEvent
  | CustomerEmailVerifiedEvent
  | CustomerStatusUpdatedEvent
