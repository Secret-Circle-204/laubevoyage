export interface PaymentCompletedEvent {
  type: 'PAYMENT_COMPLETED'
  transactionId: string
  bookingId: number
  amount: number
  currency: string
  gatewayReference?: string
  timestamp: string
}

export interface PaymentFailedEvent {
  type: 'PAYMENT_FAILED'
  transactionId: string
  bookingId: number
  reason: string
  timestamp: string
}

export interface PaymentRefundedEvent {
  type: 'PAYMENT_REFUNDED'
  transactionId: string
  bookingId: number
  amountRefunded: number
  currency: string
  timestamp: string
}

export type PaymentDomainEvent =
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent
