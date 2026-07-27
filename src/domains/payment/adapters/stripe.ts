import { stripe } from '@/lib/stripe'
import type { IPaymentAdapter } from './adapter.interface'
import type {
  CreateSessionParams,
  PaymentSessionResult,
  RefundParams,
  RefundResult,
  StripeWebhookPayload,
} from '../types'

/**
 * Stripe Payment Adapter
 * Zero-Knowledge Adapter executing payments directly against Stripe SDK.
 */
export class StripePaymentAdapter implements IPaymentAdapter {
  async createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    const unitAmountSubunits = Math.round(params.displayAmount * 100) // Convert to smallest currency unit (e.g. cents)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: params.customerEmail,
      line_items: [
        {
          price_data: {
            currency: params.displayCurrency.toLowerCase(),
            product_data: {
              name: params.experienceTitle,
              description: `Booking #${params.bookingNumber} - L'Aube Voyage`,
            },
            unit_amount: unitAmountSubunits,
          },
          quantity: 1,
        },
      ],
      metadata: {
        transactionId: params.transactionId,
        bookingId: String(params.bookingId),
        bookingNumber: params.bookingNumber,
        customerId: String(params.customerId),
        environment: process.env.NODE_ENV ? process.env.NODE_ENV : 'production',
        applicationVersion: 'v1.0.0',
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes session expiry
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    })

    if (!session.url) {
      throw new Error('[StripePaymentAdapter] Stripe Checkout Session creation did not return a hosted URL.')
    }

    return {
      sessionId: session.id,
      url: session.url,
      expiresAt: session.expires_at,
    }
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string): Promise<StripeWebhookPayload> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('[StripePaymentAdapter] Missing required STRIPE_WEBHOOK_SECRET environment variable.')
    }
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    return event as unknown as StripeWebhookPayload
  }

  async cancelSession(sessionId: string): Promise<boolean> {
    try {
      await stripe.checkout.sessions.expire(sessionId)
      return true
    } catch {
      return false
    }
  }

  async expireSession(sessionId: string): Promise<boolean> {
    return this.cancelSession(sessionId)
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const refundObj = await stripe.refunds.create({
        payment_intent: params.gatewayReference,
        amount: Math.round(params.amount * 100),
        reason: 'requested_by_customer',
      })

      return {
        refundId: refundObj.id,
        success: refundObj.status === 'succeeded',
        amountRefunded: params.amount,
        currency: params.currency,
        gatewayReference: refundObj.payment_intent ? String(refundObj.payment_intent) : undefined,
      }
    } catch (error) {
      return {
        refundId: `ref_err_${Date.now()}`,
        success: false,
        amountRefunded: 0,
        currency: params.currency,
        error: error instanceof Error ? error.message : 'Stripe refund failed',
      }
    }
  }
}
