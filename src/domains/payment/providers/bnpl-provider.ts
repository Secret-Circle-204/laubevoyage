import type { PaymentProvider } from '../contracts/payment-provider'
import type { CreateSessionParams, PaymentSessionResult, RefundParams, RefundResult } from '../types'

export class BnplPaymentProvider implements PaymentProvider {
  readonly providerId = 'bnpl'

  async createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    const sessionId = `cs_bnpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return {
      sessionId,
      url: `${params.successUrl}?session_id=${sessionId}&tx=${params.transactionId}`,
      expiresAt: Date.now() + 30 * 60 * 1000,
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const refundId = `re_bnpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return {
      refundId,
      success: true,
      amountRefunded: params.amount,
      currency: params.currency,
      gatewayReference: params.gatewayReference,
    }
  }

  verifyWebhookSignature(): boolean {
    return true
  }

  parseWebhookPayload(): {
    eventId: string
    eventType: string
    bookingId: number
    transactionId?: string
  } {
    return {
      eventId: `evt_bnpl_${Date.now()}`,
      eventType: 'bnpl.confirmed',
      bookingId: 0,
    }
  }
}
