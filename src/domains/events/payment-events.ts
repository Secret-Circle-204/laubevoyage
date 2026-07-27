import type { BaseDomainEvent } from './event-bus'

export interface PaymentCompletedEvent extends BaseDomainEvent {
  type: 'PAYMENT_COMPLETED'
  transactionId: string
  bookingId: number
  customerId: number
  customerEmail: string
  provider: 'stripe' | 'paymob' | 'bnpl'
  amount: number
  currency: string
  gatewayReference?: string
  attemptId: string
  attemptNumber: number
}

export interface PaymentFailedEvent extends BaseDomainEvent {
  type: 'PAYMENT_FAILED'
  transactionId: string
  bookingId: number
  provider: 'stripe' | 'paymob' | 'bnpl'
  reason: string
}

export interface PaymentRefundedEvent extends BaseDomainEvent {
  type: 'PAYMENT_REFUNDED'
  transactionId: string
  bookingId: number
  amountRefunded: number
  currency: string
}

export type PaymentDomainEvent =
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent
