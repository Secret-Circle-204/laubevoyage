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
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create booking draft' }
  }
}

export async function processPaymentAction(bookingId: number, gatewayId: string) {
  try {
    const { payment } = await getDomainServices()
    return payment.processPaymentCheckout({
      bookingId,
      gatewayId,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    })
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Payment processing failed' }
  }
}
