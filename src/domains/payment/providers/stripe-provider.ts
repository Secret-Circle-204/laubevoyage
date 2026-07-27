import type { PaymentProvider } from '../contracts/payment-provider'
import type { CreateSessionParams, PaymentSessionResult, RefundParams, RefundResult } from '../types'
import { StripePaymentAdapter } from '../adapters/stripe'

export class StripePaymentProvider implements PaymentProvider {
  readonly providerId = 'stripe'
  private adapter = new StripePaymentAdapter()

  async createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    return this.adapter.createCheckoutSession(params)
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return this.adapter.refund(params)
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!signature) return false
    try {
      this.adapter.verifyWebhook(rawBody, signature)
      return true
    } catch {
      return false
    }
  }

  parseWebhookPayload(rawBody: string | Buffer): {
    eventId: string
    eventType: string
    bookingId: number
    transactionId?: string
  } {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8')
    let parsed: any = {}
    try {
      parsed = JSON.parse(bodyStr)
    } catch {
      parsed = {}
    }

    return {
      eventId: parsed.id || `evt_${Date.now()}`,
      eventType: parsed.type || 'checkout.session.completed',
      bookingId: Number(parsed.data?.object?.metadata?.bookingId || 0),
      transactionId: parsed.data?.object?.metadata?.transactionId,
    }
  }
}
