import type {
  CreateSessionParams,
  PaymentSessionResult,
  RefundParams,
  RefundResult,
  StripeWebhookPayload,
} from '../types'

/**
 * Exhaustive Payment Adapter Contract
 * Rule 23 in AGENT.md: Adapters have ZERO knowledge of exchange rates or loyalty logic.
 * Execution only: accepts frozen PricingSnapshotData amounts and communicates with payment gateways.
 */
export interface IPaymentAdapter {
  createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult>
  verifyWebhook(rawBody: string | Buffer, signature: string): Promise<StripeWebhookPayload>
  retrievePaymentStatus(params: { providerSessionId?: string; providerTransactionId?: string }): Promise<{ status: 'paid' | 'failed' | 'open'; gatewayStatus: string }>
  cancelSession(sessionId: string): Promise<boolean>
  expireSession(sessionId: string): Promise<boolean>
  refund(params: RefundParams): Promise<RefundResult>
}
