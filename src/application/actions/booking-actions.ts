'use server'

import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import type { CurrencyCode } from '@/types'
import { Language } from '@/types/locale'

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
  console.log('==============================')
  console.log('[CHECKOUT ACTION] START')
  console.log(params)
  console.log('==============================')
  try {
    const session = await SessionResolver.resolve()
    if (!session.isAuthenticated || !session.customerId) {
      return { success: false, error: 'Authentication required. Please sign in to check out.' }
    }
    const userId = session.customerId

    const { booking, experience, payment, localization } = await getDomainServices()

    // Single Source of Truth: Resolve currency on server from Localization Domain (Fail-Fast)
    const localeCtx = localization.buildContext({ language: Language.EN, currency: 'USD' })
    if (!localeCtx.currency) {
      throw new Error('[confirmCheckoutAction] LocalizationDomain failed to resolve target currency.')
    }
    const serverCurrency: CurrencyCode = localeCtx.currency

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

      // 4. Create booking draft via BookingService (passing server-resolved currency)
      targetBookingId = await booking.create({
        userId,
        departure,
        travelers: params.travelers,
        endDate: endDateStr,
        currency: serverCurrency,
        source: 'website',
      })

      // 5. Domain Business Rule: Move draft booking to pending payment state
      await booking.moveToPendingPayment(targetBookingId)
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

    // 6. Delegate to PaymentService to create gateway checkout session
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

/**
 * Read-only Server Action to poll booking confirmation status.
 * Used exclusively by the /checkout/success checkpoint page (One-Writer Rule).
 */
export async function checkBookingStatusAction(params: { transactionId?: string; bookingNumber?: string }) {
  try {
    const session = await SessionResolver.resolve()
    if (!session.isAuthenticated || !session.customerId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { booking, payment, loyalty } = await getDomainServices()

    if (params.transactionId) {
      const tx = await payment.getByTransactionId(params.transactionId)
      if (tx) {
        const bookingDoc = await booking.getById(tx.bookingId)
        if (bookingDoc && bookingDoc.customerId === session.customerId) {
          const ledgerEntries = await loyalty.getCustomerLedgerHistory(session.customerId, 20)
          const earnEntry = ledgerEntries.find((e) => e.bookingId === bookingDoc.id && e.type === 'earn')
          const earnedPoints = earnEntry ? earnEntry.points : 0

          return {
            success: true,
            status: bookingDoc.status,
            paymentStatus: tx.status,
            bookingNumber: bookingDoc.bookingNumber,
            pricingSnapshot: bookingDoc.pricingSnapshot,
            earnedPoints,
          }
        }
      }
    }

    if (params.bookingNumber) {
      const bookingDoc = await booking.getByBookingNumber(params.bookingNumber)
      if (bookingDoc && bookingDoc.customerId === session.customerId) {
        const ledgerEntries = await loyalty.getCustomerLedgerHistory(session.customerId, 20)
        const earnEntry = ledgerEntries.find((e) => e.bookingId === bookingDoc.id && e.type === 'earn')
        const earnedPoints = earnEntry ? earnEntry.points : 0

        return {
          success: true,
          status: bookingDoc.status,
          paymentStatus: 'unknown',
          bookingNumber: bookingDoc.bookingNumber,
          pricingSnapshot: bookingDoc.pricingSnapshot,
          earnedPoints,
        }
      }
    }

    return { success: false, error: 'Booking context not found' }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    }
  }
}

