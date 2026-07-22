import type { IPaymentAdapter } from './adapter.interface'
import type {
  CreateSessionParams,
  PaymentSessionResult,
  RefundParams,
  RefundResult,
  StripeWebhookPayload,
} from '../types'

/**
 * Book Now Pay Later (BNPL) Payment Adapter
 * Zero-Knowledge Adapter executing immediate BNPL session confirmation without external gateway.
 */
export class BNPLPaymentAdapter implements IPaymentAdapter {
  async createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    const sessionId = `bnpl_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return {
      sessionId,
      url: `${params.successUrl}?session_id=${sessionId}`,
      expiresAt: Math.floor(Date.now() / 1000) + 30 * 60,
    }
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string): Promise<StripeWebhookPayload> {
    const parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf-8'))
    return parsed as StripeWebhookPayload
  }

  async cancelSession(sessionId: string): Promise<boolean> {
    return true
  }

  async expireSession(sessionId: string): Promise<boolean> {
    return true
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return {
      refundId: `bnpl_ref_${Date.now()}`,
      success: true,
      amountRefunded: params.amount,
      currency: params.currency,
      gatewayReference: params.gatewayReference,
    }
  }
}
