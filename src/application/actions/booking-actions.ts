'use server'

import { getDomainServices } from '@/domains/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import type { CurrencyCode, RequestContext } from '@/types'
import { cookies } from 'next/headers'
import { BookingPolicy } from '@/domains/booking/policy'

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
  idempotencyKey?: string
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

    const { booking, experience, payment, localization, payload } = await getDomainServices()

    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get('laube-locale')?.value
    const cookieCurrency = cookieStore.get('laube-currency')?.value

    // Single Source of Truth: Resolve currency on server from Localization Domain (Fail-Fast)
    const localeCtx = await localization.buildContext({
      cookieLocale,
      cookieCurrency,
    })
    if (!localeCtx.currency) {
      throw new Error('[confirmCheckoutAction] LocalizationDomain failed to resolve target currency.')
    }
    const serverCurrency: CurrencyCode = localeCtx.currency

    let targetBookingId: number = 0
    let bookingNumber: string = ''



    if (params.bookingId === 'new') {
      // 1. Resolve slot dates & details first
      const departure = params.slotId
        ? await experience.resolveBookableDepartureBySlot(params.experienceId, params.slotId)
        : await experience.resolveBookableDepartureWithoutSlot(params.experienceId)

      // 0. Idempotency Key Fast Path check (before transaction)
      if (params.idempotencyKey) {
        const existing = await booking.getByIdempotencyKey(params.idempotencyKey)
        if (existing) {
          const policyRes = BookingPolicy.canReuseForCheckout(existing, userId, params.experienceId, departure.date)
          
          if (policyRes.allowed) {
            console.log(`[confirmCheckoutAction] Fast Path: Found existing booking by idempotency key: ${params.idempotencyKey}. Reusing Booking #${existing.id}`)
            targetBookingId = existing.id
            bookingNumber = existing.bookingNumber
            
            if (existing.status === 'draft') {
              await booking.moveToPendingPayment(existing.id)
            }
          } else {
            if (policyRes.code === 'BOOKING_EXPIRED' || policyRes.code === 'BOOKING_CANCELLED' || policyRes.code === 'BOOKING_RESOLVED') {
              return { success: false, error: policyRes.reason, code: policyRes.code }
            }
            return { success: false, error: `Idempotency Conflict: Existing booking #${existing.id} found for key "${params.idempotencyKey}" but identity does not match. Details: ${policyRes.reason}`, code: 'IDEMPOTENCY_CONFLICT' }
          }
        }
      }

      if (!targetBookingId) {
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

        // Start database transaction
        const activeTx = await payload.db.beginTransaction()
        if (activeTx === null) {
          throw new Error('[confirmCheckoutAction] Failed to start database transaction.')
        }
        const transactionID: string | number = activeTx
        const context: RequestContext = { transactionId: transactionID }

        try {
          // 4. Create booking draft inside transaction
          targetBookingId = await booking.create({
            userId,
            departure,
            travelers: params.travelers,
            endDate: endDateStr,
            currency: serverCurrency,
            source: 'website',
            idempotencyKey: params.idempotencyKey,
          }, context)

          // 5. Move draft booking to pending payment state inside transaction
          await booking.moveToPendingPayment(targetBookingId, context)

          // Commit database transaction
          await payload.db.commitTransaction(transactionID)

          const bookingDoc = await booking.getById(targetBookingId)
          bookingNumber = bookingDoc.bookingNumber
        } catch (err: unknown) {
          if (transactionID) {
            await payload.db.rollbackTransaction(transactionID)
          }

          // Concurrency Recovery: Lookup booking by exact idempotencyKey outside the rolled back transaction context
          if (params.idempotencyKey) {
            console.log(`[confirmCheckoutAction] Checking recovery for idempotency key: ${params.idempotencyKey}`)
            const existing = await booking.getByIdempotencyKey(params.idempotencyKey)
            if (existing) {
              const policyRes = BookingPolicy.canReuseForCheckout(existing, userId, params.experienceId, departure.date)
              
              if (policyRes.allowed) {
                console.log(`[confirmCheckoutAction] Concurrency Recovered: Found existing booking by idempotency key: ${params.idempotencyKey}. Reusing Booking #${existing.id}`)
                targetBookingId = existing.id
                bookingNumber = existing.bookingNumber
                
                if (existing.status === 'draft') {
                  // Run status transition outside the dead transaction context
                  await booking.moveToPendingPayment(existing.id)
                }
              } else {
                if (policyRes.code === 'BOOKING_EXPIRED' || policyRes.code === 'BOOKING_CANCELLED' || policyRes.code === 'BOOKING_RESOLVED') {
                  return { success: false, error: policyRes.reason, code: policyRes.code }
                }
                throw new Error(`[confirmCheckoutAction] Idempotency Conflict: Existing booking #${existing.id} found for key "${params.idempotencyKey}" but identity does not match. Details: ${policyRes.reason}`)
              }
            } else {
              throw err
            }
          } else {
            throw err
          }
        }
      }
    } else {
      // Strict Tenant Isolation: Resolve existing booking number scoped to current authenticated user
      const bookingDoc = await booking.getByBookingNumber(params.bookingId, userId)
      if (!bookingDoc || bookingDoc.customerId !== userId) {
        return { success: false, error: 'Booking not found or unauthorized' }
      }
      targetBookingId = bookingDoc.id
      bookingNumber = bookingDoc.bookingNumber

      // Move to pending payment state if it is in draft
      if (bookingDoc.status === 'draft') {
        await booking.moveToPendingPayment(bookingDoc.id)
      }
    }

    // 6. Delegate to PaymentService to create gateway checkout session (reuses initiated session if active)
    const paymentRes = await payment.processPaymentCheckout({
      bookingId: targetBookingId,
      gatewayId: params.gatewayId,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    })

    return {
      ...paymentRes,
      bookingNumber,
    }
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

    const { booking, payment, loyalty, localization } = await getDomainServices()
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get('laube-locale')?.value
    const cookieCurrency = cookieStore.get('laube-currency')?.value
    const ctx = await localization.buildContext({
      cookieLocale,
      cookieCurrency,
    })

    if (params.transactionId) {
      const tx = await payment.getByTransactionId(params.transactionId)
      if (tx) {
        const bookingDoc = await booking.getById(tx.bookingId)
        if (bookingDoc && bookingDoc.customerId === session.customerId) {
          const ledgerEntries = await loyalty.getCustomerLedgerHistory(session.customerId, 20)
          const earnEntry = ledgerEntries.find((e) => e.bookingId === bookingDoc.id && e.type === 'earn')
          const earnedPoints = earnEntry ? earnEntry.points : undefined

          const snap = bookingDoc.pricingSnapshot
          let formattedTotalPrice = ''
          if (snap) {
            if (snap.displayAmount !== undefined && snap.displayCurrency) {
              const formattedPriceDto = await localization.formatAlreadyConvertedPrice(
                snap.displayAmount,
                snap.basePriceEGP,
                snap.displayCurrency,
                snap.exchangeRate || 1,
                ctx
              )
              formattedTotalPrice = formattedPriceDto.formatted
            } else {
              const formattedPriceDto = await localization.formatPrice(
                snap.totalAmountEGP || snap.basePriceEGP,
                ctx
              )
              formattedTotalPrice = formattedPriceDto.formatted
            }
          }

          return {
            success: true,
            status: bookingDoc.status,
            paymentStatus: tx.status,
            bookingNumber: bookingDoc.bookingNumber,
            pricingSnapshot: bookingDoc.pricingSnapshot,
            formattedTotalPrice,
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
        const earnedPoints = earnEntry ? earnEntry.points : undefined

        const snap = bookingDoc.pricingSnapshot
        let formattedTotalPrice = ''
        if (snap) {
          if (snap.displayAmount !== undefined && snap.displayCurrency) {
            const formattedPriceDto = await localization.formatAlreadyConvertedPrice(
              snap.displayAmount,
              snap.basePriceEGP,
              snap.displayCurrency,
              snap.exchangeRate || 1,
              ctx
            )
            formattedTotalPrice = formattedPriceDto.formatted
          } else {
            const formattedPriceDto = await localization.formatPrice(
              snap.totalAmountEGP || snap.basePriceEGP,
              ctx
            )
            formattedTotalPrice = formattedPriceDto.formatted
          }
        }

        return {
          success: true,
          status: bookingDoc.status,
          paymentStatus: 'unknown',
          bookingNumber: bookingDoc.bookingNumber,
          pricingSnapshot: bookingDoc.pricingSnapshot,
          formattedTotalPrice,
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

