import type { CreateSessionParams, PaymentSessionResult, RefundParams, RefundResult } from '../types'

export interface PaymentProvider {
  readonly providerId: string

  createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult>

  refund(params: RefundParams): Promise<RefundResult>

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean

  parseWebhookPayload(rawBody: string | Buffer): {
    eventId: string
    eventType: string
    bookingId: number
    transactionId?: string
  }
}
