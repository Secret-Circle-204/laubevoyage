export type PaymentProviderType = 'stripe' | 'bnpl' | 'manual'

export type PaymentStatusType =
  | 'initiated'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'

export interface PaymentActor {
  id: number | string
  type: 'customer' | 'admin' | 'system'
  name?: string
  ipAddress?: string
}

export interface PaymentSessionResult {
  sessionId: string
  url?: string
  expiresAt?: number
}

export interface PaymentAttemptRecord {
  attemptId: string
  attemptNumber: number
  provider: PaymentProviderType
  amount: number
  currency: string
  status: 'initiated' | 'successful' | 'failed' | 'timed_out'
  transactionReference?: string
  failureReason?: string
  timestamp: string
}

export interface WebhookLedgerRecord {
  eventId: string
  provider: PaymentProviderType
  eventType: string
  bookingId: number
  processedAt: string
  status: 'processed' | 'failed'
}

export interface PaymentAuditRecord {
  auditId: string
  actor: PaymentActor
  provider: PaymentProviderType
  action: string
  reason?: string
  previousState?: PaymentStatusType
  newState?: PaymentStatusType
  transactionId: string
  bookingId: number
  timestamp: string
}

export interface StripeWebhookPayload {
  id: string
  type: string
  data: {
    object: {
      id: string
      metadata?: {
        bookingId?: string | number
        customerId?: string | number
        transactionId?: string
      } | null
      payment_intent?: string | null
      amount_total?: number | null
      currency?: string | null
    }
  }
}

export interface CreateSessionParams {
  transactionId: string
  bookingId: number
  customerId: number
  bookingNumber: string
  basePriceEGP: number
  displayCurrency: string
  displayAmount: number
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  experienceTitle: string
}

export interface RefundParams {
  transactionId: string
  bookingId: number
  gatewayReference: string
  amount: number
  currency: string
  reason?: string
}

export interface RefundResult {
  refundId: string
  success: boolean
  amountRefunded: number
  currency: string
  gatewayReference?: string
  error?: string
}

export interface PaymentPolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}
