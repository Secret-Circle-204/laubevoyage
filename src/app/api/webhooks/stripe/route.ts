import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'

export async function POST(request: NextRequest) {
  try {
    const services = await getDomainServices()
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    const result = await services.payment.handleStripeWebhook(rawBody, signature)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error handling Stripe webhook:', error instanceof Error ? error.message : 'Unknown webhook error')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook error' },
      { status: 400 },
    )
  }
}
