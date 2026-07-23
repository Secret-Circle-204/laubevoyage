import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDomainServices } from '@/domains'
import { stripe } from '@/lib/stripe'

interface StripeWebhookEvent {
  type: string
  data: {
    object: {
      id: string
      metadata?: {
        bookingId?: string | number
      } | null
      payment_intent?: string | null
    }
  }
}

/**
 * POST /api/webhooks/stripe
 * Stripe Webhook endpoint
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured!')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  try {
    const rawBody = await request.text()
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

    const payload = await getPayload({ config })
    const services = getDomainServices(payload)

    await services.payment.handleStripeWebhook(rawBody, signature)

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error handling Stripe webhook:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 400 }
    )
  }
}
