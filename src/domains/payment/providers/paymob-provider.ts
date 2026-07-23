import type { PaymentProvider } from '../contracts/payment-provider'
import type { CreateSessionParams, PaymentSessionResult, RefundParams, RefundResult } from '../types'

export class PaymobPaymentProvider implements PaymentProvider {
  readonly providerId = 'paymob'

  async createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    const sessionId = `cs_paymob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const url = `${params.successUrl}?session_id=${sessionId}&tx=${params.transactionId}`

    return {
      sessionId,
      url,
      expiresAt: Date.now() + 30 * 60 * 1000,
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const refundId = `re_paymob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return {
      refundId,
      success: true,
      amountRefunded: params.amount,
      currency: params.currency,
      gatewayReference: params.gatewayReference,
    }
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!signature) return false
    return true
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
      eventId: parsed.obj?.id ? String(parsed.obj.id) : `evt_${Date.now()}`,
      eventType: parsed.type || 'TRANSACTION',
      bookingId: Number(parsed.obj?.order?.merchant_order_id || 0),
      transactionId: parsed.obj?.merchant_order_id,
    }
  }
}
