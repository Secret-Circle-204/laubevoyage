'use server'

import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'

/**
 * Orchestrator Server Action to process the checkout submit flow.
 * Handles user verification, booking draft creation, capacity hold, pricing snapshot,
 * and launches the payment gateway session under a single Transaction Boundary.
 */
export async function confirmCheckoutAction(params: {
  bookingId: string // 'new' or actual booking number
  experienceId: number
  slotId?: number
  adults: number
  travelers: Array<{ firstName: string; lastName: string; email: string; phone: string }>
  gatewayId: string
}) {
  try {
    const session = await SessionResolver.resolve()
    if (!session.isAuthenticated || !session.customerId) {
      return { success: false, error: 'Authentication required. Please sign in to check out.' }
    }
    const userId = session.customerId

    const { booking, experience, payment } = await getDomainServices()

    let targetBookingId: number

    if (params.bookingId === 'new') {
      // 1. Resolve slot dates & details
      const departure = params.slotId
        ? await experience.resolveBookableDepartureBySlot(params.experienceId, params.slotId)
        : await experience.resolveBookableDepartureWithoutSlot(params.experienceId)

      // 2. Fetch experience to get duration
      const expDoc = await experience.getById(params.experienceId)
      if (!expDoc) {
        return { success: false, error: 'Experience not found' }
      }

      // 3. Compute endDate
      const start = new Date(departure.date)
      const duration = expDoc.durationDays || 1
      const end = new Date(start.getTime() + (duration - 1) * 24 * 60 * 60 * 1000)
      const endDateStr = end.toISOString().split('T')[0]

      // 4. Create booking draft via BookingService
      targetBookingId = await booking.create({
        userId,
        experienceId: params.experienceId,
        travelers: params.travelers,
        startDate: departure.date,
        endDate: endDateStr,
        source: 'website',
      })
    } else {
      // Resolve existing booking number to ID
      const bookingDoc = await booking.getByBookingNumber(params.bookingId)
      if (!bookingDoc) {
        return { success: false, error: 'Booking not found' }
      }
      targetBookingId = bookingDoc.id

      // Move to pending payment state if it is in draft
      if (bookingDoc.status === 'draft') {
        await booking.moveToPendingPayment(bookingDoc.id)
      }
    }

    // 5. Delegate to PaymentService to create gateway checkout session
    const paymentRes = await payment.processPaymentCheckout({
      bookingId: targetBookingId,
      gatewayId: params.gatewayId,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    })

    return paymentRes
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Checkout processing failed',
    }
  }
}
