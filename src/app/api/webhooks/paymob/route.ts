import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'

export async function POST(request: NextRequest) {
  try {
    const services = await getDomainServices()
    const rawBody = await request.text()
    const signature = request.headers.get('x-paymob-hmac') || ''
    const correlationId = request.headers.get('x-correlation-id') || `corr_paymob_${Date.now()}`

    const result = await services.payment.handlePaymobWebhook(rawBody, signature, { correlationId })

    return NextResponse.json({ received: true, processed: result.processed })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Paymob webhook processing error' },
      { status: 400 },
    )
  }
}
