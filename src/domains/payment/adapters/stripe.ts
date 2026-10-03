import { stripe } from '@/lib/stripe'
import type { IPaymentAdapter } from './adapter.interface'
import type {
  CreateSessionParams,
  PaymentSessionResult,
  RefundParams,
  RefundResult,
  StripeWebhookPayload,
  GatewaySessionExpirationResult,
} from '../types'
import { toSmallestUnit } from '@/domains/currency/rounding'

/**
 * Stripe Payment Adapter
 * Zero-Knowledge Adapter executing payments directly against Stripe SDK.
 */
export class StripePaymentAdapter implements IPaymentAdapter {
  async createCheckoutSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    const unitAmountSubunits = await toSmallestUnit(params.displayAmount, params.displayCurrency)

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

  async retrievePaymentStatus(params: { providerSessionId?: string; providerTransactionId?: string }): Promise<{ status: 'paid' | 'failed' | 'open'; gatewayStatus: string; completedAt?: string }> {
    const sessionId = params.providerSessionId
    if (!sessionId) {
      throw new Error('[StripePaymentAdapter] retrievePaymentStatus requires providerSessionId.')
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })
    const gatewayStatus = session.status || 'unknown'
    const paymentStatus = (session.payment_status as string) || 'unpaid'

    let status: 'paid' | 'failed' | 'open' = 'open'
    if (paymentStatus === 'paid') {
      status = 'paid'
    } else if (gatewayStatus === 'expired') {
      status = 'failed'
    } else if (gatewayStatus === 'complete' && paymentStatus !== 'paid') {
      status = 'failed'
    } else if (gatewayStatus === 'open') {
      status = 'open'
    } else {
      status = 'failed'
    }

    let completedAt: string | undefined = undefined
    if (status === 'paid') {
      const paymentIntent = session.payment_intent as any
      const chargeCreated = paymentIntent?.charges?.data?.[0]?.created
      if (chargeCreated) {
        completedAt = new Date(chargeCreated * 1000).toISOString()
      } else if (session.created) {
        completedAt = new Date(session.created * 1000).toISOString()
      }
    }

    return {
      status,
      gatewayStatus: `session:${gatewayStatus}_payment:${paymentStatus}`,
      completedAt,
    }
  }

  async cancelSession(sessionId: string): Promise<boolean> {
    try {
      await stripe.checkout.sessions.expire(sessionId)
      return true
    } catch {
      return false
    }
  }

  async expireSession(sessionId: string): Promise<GatewaySessionExpirationResult> {
    try {
      await stripe.checkout.sessions.expire(sessionId)
      return {
        success: true,
        outcome: 'expired_successfully',
        sessionId,
      }
    } catch (err: unknown) {
      const errorObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {}
      const rawError = (errorObj.raw && typeof errorObj.raw === 'object' ? errorObj.raw : {}) as Record<string, unknown>

      const code = (errorObj.code || rawError.code) as string | undefined
      const statusCode = (errorObj.statusCode || errorObj.status || rawError.statusCode) as number | undefined
      const errorType = (errorObj.type || rawError.type) as string | undefined
      const msg = String(errorObj.message || rawError.message || err || '')

      // Outcome E: Resource missing / 404 (structured attributes first)
      if (code === 'resource_missing' || statusCode === 404) {
        return {
          success: false,
          outcome: 'resource_missing',
          sessionId,
          errorDetails: msg,
        }
      }

      // Check for Stripe invalid request / 400 state mismatch
      const isInvalidRequest =
        statusCode === 400 ||
        errorType === 'invalid_request_error' ||
        errorType === 'StripeInvalidRequestError'

      if (isInvalidRequest) {
        const lowerMsg = msg.toLowerCase()

        // Outcome B: Already expired (idempotent final gateway state achieved)
        // Matches exact real Stripe response: "Only Checkout Sessions with a status in ['open'] can be expired. This Checkout Session has a status of expired."
        // Also matches legacy / variations: "This Checkout Session is already expired."
        const isAlreadyExpired =
          lowerMsg.includes('already expired') ||
          (lowerMsg.includes('can be expired') && lowerMsg.includes('status of expired')) ||
          /status (?:is|of|in)\s*['"`]?expired/i.test(lowerMsg)

        if (isAlreadyExpired) {
          return {
            success: true,
            outcome: 'already_expired',
            sessionId,
          }
        }

        // Outcome C: Concurrent payment complete (Do NOT treat as expiration success)
        // Matches exact real Stripe response: "Only Checkout Sessions with a status in ['open'] can be expired. This Checkout Session has a status of complete."
        const isComplete =
          (lowerMsg.includes('can be expired') && lowerMsg.includes('status of complete')) ||
          /status (?:is|of|in)\s*['"`]?complete/i.test(lowerMsg)

        if (isComplete) {
          return {
            success: false,
            outcome: 'concurrent_payment_complete',
            sessionId,
            errorDetails: msg,
          }
        }
      }

      // Outcome D: Network or unexpected API failure
      return {
        success: false,
        outcome: 'network_error',
        sessionId,
        errorDetails: msg,
      }
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const amountSubunits = await toSmallestUnit(params.amount, params.currency)
      const refundObj = await stripe.refunds.create({
        payment_intent: params.gatewayReference,
        amount: amountSubunits,
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
