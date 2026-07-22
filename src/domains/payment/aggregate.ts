import type {
  PaymentProviderType,
  PaymentStatusType,
  PaymentSessionResult,
  PaymentAttemptRecord,
  WebhookLedgerRecord,
  PaymentAuditRecord,
} from './types'

/**
 * Payment Aggregate Root
 * Single source of truth for payment transaction domain model and state.
 */
export interface PaymentAggregate {
  transactionId: string
  bookingId: number
  customerId: number
  version: number // Optimistic locking & event sourcing
  provider: PaymentProviderType
  status: PaymentStatusType
  
  session: PaymentSessionResult
  
  attempts: PaymentAttemptRecord[]
  webhookLedger: WebhookLedgerRecord[]
  auditTrail: PaymentAuditRecord[]
  
  gatewayReference?: string
  createdAt: string
  updatedAt: string
}
