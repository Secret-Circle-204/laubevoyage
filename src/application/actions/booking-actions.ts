'use server'

import { getDomainServices } from '@/domains/factory'

export async function createBookingAction(formData: {
  userId: number
  experienceId: number
  travelers: Array<{ firstName: string; lastName: string; email: string; phone: string }>
  startDate: string
  endDate: string
}) {
  try {
    const { booking } = await getDomainServices()
    const bookingId = await booking.create({
      userId: formData.userId,
      experienceId: formData.experienceId,
      travelers: formData.travelers,
      startDate: formData.startDate,
      endDate: formData.endDate,
    })

    return { success: true, bookingId }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create booking draft' }
  }
}

export async function processPaymentAction(bookingId: number, gatewayId: string) {
  try {
    const { payment } = await getDomainServices()

    if (gatewayId === 'bnpl') {
      const paymentAggregate = await payment.processBookNowPayLater(bookingId)
      return { success: true, transactionId: paymentAggregate.transactionId, status: paymentAggregate.status }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const session = await payment.createStripeSession(
      bookingId,
      `${appUrl}/dashboard/bookings`,
      `${appUrl}/checkout/${bookingId}`,
    )

    return { success: true, transactionId: session.transactionId, checkoutUrl: session.url }
  } catch (error: any) {
    return { success: false, error: error.message || 'Payment processing failed' }
  }
}
