import { NextRequest, NextResponse } from 'next/server'
import { getDomainServices } from '@/domains/factory'
import { PaymentProviderFactory } from '@/domains/payment/factory/payment-provider-factory'

export async function POST(request: NextRequest) {
  try {
    const services = await getDomainServices()
    const rawBody = await request.text()
    const signature = request.headers.get('x-paymob-hmac') || ''

    const paymobProvider = PaymentProviderFactory.getProvider('paymob')
    const isValid = paymobProvider.verifyWebhookSignature(rawBody, signature)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
    }

    const payload = paymobProvider.parseWebhookPayload(rawBody)

    if (payload.bookingId) {
      await services.booking.confirmBooking({
        bookingId: payload.bookingId,
        paymentReference: payload.transactionId || payload.eventId,
      })
    }

    return NextResponse.json({ received: true, eventId: payload.eventId })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Paymob webhook processing error' },
      { status: 400 },
    )
  }
}
