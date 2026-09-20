'use server'

import { getDomainServices } from '@/domains/factory'
import { getApplicationServices } from '@/application/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import type { CurrencyCode, RequestContext } from '@/types'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'
import { cookies } from 'next/headers'
import { BookingPolicy } from '@/domains/booking/policy'
import { PaymentAttemptsService } from '@/domains/booking/payment-attempts'
import { addDaysToDateString } from '@/lib/date'
import type { TravelerInput, BookingPickupLocation } from '@/domains/booking/types'

/**
 * Orchestrator Server Action to process the checkout submit flow.
 * Handles user verification, booking draft creation, capacity hold, pricing snapshot,
 * and launches the payment gateway session under a single Transaction Boundary.
 */
export async function confirmCheckoutAction(params: {
  bookingId: string // 'new' or actual booking number
  experienceId: number
  slotId?: number
  date?: string
  startTime?: string
  adults: number
  childrenCount?: number
  childAges?: number[]
  childBeddingModes?: ('sharing_bed' | 'extra_bed')[]
  selectedAllocationId?: string
  selectedAccommodationOptions?: Record<number, string>
  travelers: TravelerInput[]
  gatewayId: string
  idempotencyKey?: string
  pointsToRedeem?: number
  pickupLocation?: BookingPickupLocation | null
}) {
  console.log('[CHECKOUT ACTION] START:', {
    bookingId: params.bookingId,
    experienceId: params.experienceId,
    slotId: params.slotId,
    date: params.date,
    startTime: params.startTime,
    adults: params.adults,
    travelers: params.travelers,
    gatewayId: params.gatewayId,
    idempotencyKey: params.idempotencyKey,
    pointsToRedeem: params.pointsToRedeem,
  })
  try {
    const session = await SessionResolver.resolve()
    if (!session.isAuthenticated || !session.customerId || session.role !== 'customer') {
      if (session.isAuthenticated && (session.role === 'admin' || session.role === 'super_admin')) {
        return {
          success: false,
          error:
            'Staff accounts cannot create customer reservations. Please sign in with a traveler account.',
        }
      }
      return { success: false, error: 'Authentication required. Please sign in to check out.' }
    }
    const userId = session.customerId

    // Transport validation: strict non-negative integer check
    if (params.pointsToRedeem !== undefined && params.pointsToRedeem !== null) {
      if (
        typeof params.pointsToRedeem !== 'number' ||
        !Number.isFinite(params.pointsToRedeem) ||
        !Number.isInteger(params.pointsToRedeem) ||
        params.pointsToRedeem < 0
      ) {
        return {
          success: false,
          error: 'Invalid loyalty points redemption amount. Points must be a non-negative integer.',
          code: 'INVALID_POINTS_INPUT',
        }
      }
    }
    const pointsToRedeem =
      typeof params.pointsToRedeem === 'number' && params.pointsToRedeem > 0
        ? params.pointsToRedeem
        : undefined

    const { booking, experience, payment, localization, payload, bookingPricingUseCase, loyalty } =
      await getApplicationServices()

    let cookieLocale: string | undefined
    let cookieCurrency: string | undefined
    try {
      const cookieStore = await cookies()
      cookieLocale = cookieStore.get('laube-locale')?.value
      cookieCurrency = cookieStore.get('laube-currency')?.value
    } catch {
      // In unit/integration tests without Next.js request store
    }

    // Single Source of Truth: Resolve currency on server from Localization Domain (Fail-Fast)
    const localeCtx = await localization.buildContext({
      cookieLocale,
      cookieCurrency,
    })
    if (!localeCtx.currency) {
      throw new Error(
        '[confirmCheckoutAction] LocalizationDomain failed to resolve target currency.',
      )
    }
    const serverCurrency: CurrencyCode = localeCtx.currency

    let targetBookingId: number = 0
    let bookingNumber: string = ''

    if (params.bookingId === 'new') {
      let departure: any = null

      const expDoc = await experience.getById(params.experienceId)
      if (!expDoc) {
        return { success: false, error: 'Experience not found' }
      }

      const isFixedPackage =
        expDoc.type === 'package' &&
        ((expDoc as any).packageMode === 'fixed_date' ||
          (!(expDoc as any).packageMode && params.slotId))
      const isFlexiblePackage =
        expDoc.type === 'package' && (expDoc as any).packageMode === 'flexible_date'
      const isDailyTour = expDoc.type === 'daily_tour'

      if (isDailyTour) {
        if (!params.date) {
          return { success: false, error: 'Date is required for daily tour checkout' }
        }
        if (!params.startTime) {
          return { success: false, error: 'Start time is required for daily tour checkout' }
        }
        departure = await experience.resolvePreviewDepartureByDate(
          params.experienceId,
          params.date,
          params.startTime,
        )
        if (!departure) {
          return {
            success: false,
            error: `Departure on date ${params.date} at ${params.startTime} not found`,
          }
        }
      } else if (isFlexiblePackage) {
        if (!params.date) {
          return { success: false, error: 'Start date is required for flexible package checkout' }
        }
        departure = await experience.resolvePreviewDepartureByDate(
          params.experienceId,
          params.date,
          '',
        )
        if (!departure) {
          return { success: false, error: `Departure on date ${params.date} not found` }
        }
      } else if (isFixedPackage) {
        if (!params.slotId) {
          return { success: false, error: 'Departure slot is required for fixed package checkout' }
        }
        departure = await experience.resolveBookableDepartureBySlot(
          params.experienceId,
          params.slotId,
        )
        if (!departure) {
          return { success: false, error: `Departure slot #${params.slotId} not found` }
        }
      } else {
        return { success: false, error: 'Invalid experience type for checkout' }
      }

      if (departure.status === 'past') {
        return {
          success: false,
          error: 'The selected departure has already passed and cannot be booked.',
          code: 'DEPARTURE_IN_PAST',
        }
      }

      if (departure.status === 'blacked_out') {
        return {
          success: false,
          error: 'The selected date is currently unavailable for booking.',
          code: 'BLACKED_OUT',
        }
      }

      // 0. Idempotency Key Fast Path check (before transaction)
      if (params.idempotencyKey) {
        const existing = await booking.getByIdempotencyKey(params.idempotencyKey)
        if (existing) {
          const policyRes = BookingPolicy.canReuseForCheckout(
            existing,
            userId,
            params.experienceId,
            departure.date,
            serverCurrency,
            params.gatewayId,
          )

          if (policyRes.allowed) {
            console.log(
              `[confirmCheckoutAction] Fast Path: Found existing booking by idempotency key: ${params.idempotencyKey}. Reusing Booking #${existing.id}`,
            )
            targetBookingId = existing.id
            bookingNumber = existing.bookingNumber

            if (params.gatewayId === 'bnpl') {
              if (existing.status === 'draft' || existing.status === 'pending_payment') {
                await booking.moveToPendingAdminReview(existing.id)
              }
            } else if (existing.status === 'draft') {
              await booking.moveToPendingPayment(existing.id)
            }
          } else {
            if (
              policyRes.code === 'BOOKING_EXPIRED' ||
              policyRes.code === 'BOOKING_CANCELLED' ||
              policyRes.code === 'BOOKING_RESOLVED'
            ) {
              return { success: false, error: policyRes.reason, code: policyRes.code }
            }
            return {
              success: false,
              error: `Idempotency Conflict: Existing booking #${existing.id} found for key "${params.idempotencyKey}" but details do not match. Details: ${policyRes.reason}`,
              code: 'IDEMPOTENCY_CONFLICT',
            }
          }
        }
      }

      if (!targetBookingId) {
        // 1. Intent Validation: Consistency checks on manifest vs submitted numbers
        const submittedAdults = params.adults
        const submittedChildren = params.childrenCount ?? 0
        const submittedChildAges = params.childAges || []
        const submittedChildBeddingModes = params.childBeddingModes || []
        const submittedTravelers: TravelerInput[] = (params.travelers || []).map((t) => ({
          ...t,
          firstName: t.firstName?.trim() || '',
          lastName: t.lastName?.trim() || '',
          email: t.email && t.email.trim() !== '' ? t.email.trim() : undefined,
          phone: t.phone && t.phone.trim() !== '' ? t.phone.trim() : undefined,
          dateOfBirth: t.dateOfBirth && t.dateOfBirth.trim() !== '' ? t.dateOfBirth.trim() : undefined,
          passportNumber: t.passportNumber && t.passportNumber.trim() !== '' ? t.passportNumber.trim() : undefined,
          nationality: t.nationality && t.nationality.trim() !== '' ? t.nationality.trim() : undefined,
        }))

        if (submittedTravelers.length > 0) {
          const adultTravelers = submittedTravelers.filter((t) => !t.type || t.type === 'adult').length
          const childTravelers = submittedTravelers.filter((t) => t.type === 'child').length
          const infantTravelers = submittedTravelers.filter((t) => t.type === 'infant').length
          const totalManifestChildren = childTravelers + infantTravelers

          if (submittedTravelers.length !== submittedAdults + submittedChildren) {
            return {
              success: false,
              error: `Traveler manifest count (${submittedTravelers.length}) does not match submitted totals (Adults: ${submittedAdults}, Children: ${submittedChildren}).`,
              code: 'MANIFEST_COUNT_MISMATCH',
            }
          }
          if (adultTravelers !== submittedAdults || totalManifestChildren !== submittedChildren) {
            return {
              success: false,
              error: `Passenger type breakdown mismatch. Expected ${submittedAdults} adults and ${submittedChildren} children, but manifest has ${adultTravelers} adults and ${totalManifestChildren} children/infants.`,
              code: 'PASSENGER_TYPE_MISMATCH',
            }
          }
        }

        if (submittedChildren > 0) {
          if (submittedChildAges.length !== submittedChildren) {
            return {
              success: false,
              error: `Submitted ${submittedChildren} children but received ${submittedChildAges.length} child ages.`,
              code: 'CHILD_AGES_MISMATCH',
            }
          }
        }

        // 2. Authoritative Pricing SSOT Calculation (BookingPricingUseCase is the ONLY authority)
        let pricingResult
        if (isFixedPackage) {
          pricingResult = await bookingPricingUseCase.calculate({
            experienceId: params.experienceId,
            slotId: departure.id,
            adultsCount: submittedAdults,
            childrenCount: submittedChildren,
            childAges: submittedChildAges,
            childBeddingModes: submittedChildBeddingModes,
            selectedAllocationId: params.selectedAllocationId,
            selectedAccommodationOptions: params.selectedAccommodationOptions,
            ctx: localeCtx,
            pointsToRedeem,
            customerId: userId,
          })
        } else {
          pricingResult = await bookingPricingUseCase.calculatePreview({
            experienceId: params.experienceId,
            date: params.date,
            startTime: params.startTime || '',
            adultsCount: submittedAdults,
            childrenCount: submittedChildren,
            childAges: submittedChildAges,
            childBeddingModes: submittedChildBeddingModes,
            selectedAllocationId: params.selectedAllocationId,
            selectedAccommodationOptions: params.selectedAccommodationOptions,
            ctx: localeCtx,
            pointsToRedeem,
            customerId: userId,
          })
        }

        const authoritativePricingSnapshot = pricingResult.snapshot

        // 3. Compute endDate strictly via calendar arithmetic
        let endDateStr = departure.date
        if (expDoc.type === 'package' && expDoc.durationDays && expDoc.durationDays > 0) {
          endDateStr = addDaysToDateString(departure.date, expDoc.durationDays - 1)
        }

        // Validate optional pickup location if submitted
        let validatedPickupLocation: BookingPickupLocation | null = null
        if (params.pickupLocation) {
          const { label, address, latitude, longitude, instructions, source } = params.pickupLocation
          if (!label || typeof label !== 'string' || !label.trim()) {
            return { success: false, error: 'Please provide a valid location name for pickup.' }
          }
          if (!address || typeof address !== 'string' || !address.trim()) {
            return { success: false, error: 'Please provide a valid address for pickup.' }
          }
          if (typeof latitude !== 'number' || isNaN(latitude) || typeof longitude !== 'number' || isNaN(longitude)) {
            return { success: false, error: 'Please select a valid geographical location on the map.' }
          }
          validatedPickupLocation = {
            label: label.trim().slice(0, 200),
            address: address.trim().slice(0, 500),
            latitude: Number(latitude),
            longitude: Number(longitude),
            instructions: instructions ? instructions.trim().slice(0, 500) : undefined,
            source: source || 'map',
          }
        }

        // Start database transaction
        const activeTx = await payload.db.beginTransaction()
        if (activeTx === null) {
          throw new Error('[confirmCheckoutAction] Failed to start database transaction.')
        }
        const transactionID: string | number = activeTx
        const context: RequestContext = { transactionId: transactionID }

        try {
          // 4. Create booking draft inside transaction with authoritative pricing snapshot
          targetBookingId = await booking.create(
            {
              userId,
              departure,
              travelers: submittedTravelers,
              endDate: endDateStr,
              currency: serverCurrency,
              source: 'website',
              idempotencyKey: params.idempotencyKey,
              pointsToRedeem,
              pricingSnapshot: authoritativePricingSnapshot as any,
              requestedRooms: pricingResult.commercialBreakdown?.roomCount || 1,
              pickupLocation: validatedPickupLocation,
            },
            context,
          )

          // 5. Move draft booking to next state inside transaction
          if (params.gatewayId === 'bnpl') {
            await booking.moveToPendingAdminReview(targetBookingId, context)
          } else {
            await booking.moveToPendingPayment(targetBookingId, context)
          }

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
            console.log(
              `[confirmCheckoutAction] Checking recovery for idempotency key: ${params.idempotencyKey}`,
            )
            const existing = await booking.getByIdempotencyKey(params.idempotencyKey)
            if (existing) {
              const policyRes = BookingPolicy.canReuseForCheckout(
                existing,
                userId,
                params.experienceId,
                departure.date,
                serverCurrency,
                params.gatewayId,
              )

              if (policyRes.allowed) {
                console.log(
                  `[confirmCheckoutAction] Concurrency Recovered: Found existing booking by idempotency key: ${params.idempotencyKey}. Reusing Booking #${existing.id}`,
                )
                targetBookingId = existing.id
                bookingNumber = existing.bookingNumber

                if (params.gatewayId === 'bnpl') {
                  if (existing.status === 'draft' || existing.status === 'pending_payment') {
                    await booking.moveToPendingAdminReview(existing.id)
                  }
                } else if (existing.status === 'draft') {
                  await booking.moveToPendingPayment(existing.id)
                }
              } else {
                if (
                  policyRes.code === 'BOOKING_EXPIRED' ||
                  policyRes.code === 'BOOKING_CANCELLED' ||
                  policyRes.code === 'BOOKING_RESOLVED'
                ) {
                  return { success: false, error: policyRes.reason, code: policyRes.code }
                }
                throw new Error(
                  `[confirmCheckoutAction] Idempotency Conflict: Existing booking #${existing.id} found for key "${params.idempotencyKey}" but details do not match. Details: ${policyRes.reason}`,
                )
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

      // Pre-Payment Policy Invariant: Validate stored pointHold & pricingSnapshot against active policy before checkout
      if (bookingDoc.pointHold && bookingDoc.pointHold.pointsHeld > 0) {
        if (loyalty) {
          const activeConfig = await loyalty.getActiveConfig()
          const redemptionCheck = BookingPolicy.validateBookingRedemptionForCheckout(
            bookingDoc,
            activeConfig,
          )
          if (!redemptionCheck.allowed) {
            return {
              success: false,
              error: `Booking checkout rejected: ${redemptionCheck.reason}`,
              code: redemptionCheck.code,
              failureStage: 'booking' as const,
            }
          }
        }
      }

      // Move to next state based on gateway and current status
      if (params.gatewayId === 'bnpl') {
        if (bookingDoc.status === 'draft' || bookingDoc.status === 'pending_payment') {
          await booking.moveToPendingAdminReview(bookingDoc.id)
        }
      } else if (bookingDoc.status === 'draft') {
        await booking.moveToPendingPayment(bookingDoc.id)
      }
    }

    // 6. BNPL has no external payment gateway or checkout session; route directly to review checkpoint
    if (params.gatewayId === 'bnpl') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const checkoutUrl = `${baseUrl}/checkout/success?bookingNumber=${bookingNumber}`
      console.log('[CHECKOUT ACTION] BNPL Result:', {
        bookingNumber,
        status: 'pending_admin_review',
        reviewUrl: `/checkout/success?bookingNumber=${bookingNumber}`,
      })
      return {
        success: true,
        transactionId: '',
        checkoutUrl,
        bookingNumber,
      }
    }

    // 6. Delegate to PaymentService to create gateway checkout session (reuses initiated session if active)
    const paymentRes = await payment.processPaymentCheckout({
      bookingId: targetBookingId,
      gatewayId: params.gatewayId,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    })

    const cleanStripeUrl = paymentRes.checkoutUrl ? paymentRes.checkoutUrl.split('#')[0] : ''
    console.log('[CHECKOUT ACTION] Stripe Result:', {
      bookingNumber,
      success: paymentRes.success,
      transactionId: paymentRes.transactionId,
      checkoutUrl: cleanStripeUrl,
    })

    return {
      ...paymentRes,
      bookingNumber,
      failureStage: paymentRes.success ? undefined : ('payment' as const),
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Checkout processing failed'
    console.error('[CHECKOUT ACTION] Error:', errorMsg)

    // Sanitize internal database / driver errors so raw SQL is not leaked to the customer
    const isDatabaseError =
      errorMsg.includes('Failed query') ||
      errorMsg.includes('syntax for type') ||
      errorMsg.includes('PostgreSQL') ||
      errorMsg.includes('pg_') ||
      errorMsg.includes('insert into')

    const customerMessage = isDatabaseError
      ? 'An unexpected error occurred while saving your reservation details. Please check your traveler information and try again.'
      : errorMsg

    return {
      success: false,
      error: customerMessage,
      failureStage: 'booking' as const,
    }
  }
}

/**
 * Read-only Server Action to poll booking confirmation status.
 * Used exclusively by the /checkout/success checkpoint page (One-Writer Rule).
 */
export async function checkBookingStatusAction(params: {
  transactionId?: string
  bookingNumber?: string
}) {
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
          const earnEntry = ledgerEntries.find(
            (e: any) => e.bookingId === bookingDoc.id && e.type === 'earn',
          )
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
                ctx,
              )
              formattedTotalPrice = formattedPriceDto.formatted
            } else {
              const formattedPriceDto = await localization.formatPrice(snap.totalAmountEGP, ctx)
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
        const earnEntry = ledgerEntries.find(
          (e: any) => e.bookingId === bookingDoc.id && e.type === 'earn',
        )
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
              ctx,
            )
            formattedTotalPrice = formattedPriceDto.formatted
          } else {
            const formattedPriceDto = await localization.formatPrice(
              snap.totalAmountEGP || snap.basePriceEGP,
              ctx,
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

/**
 * Server Action: Admin Confirm Booking with optional cash/deposit recording.
 * Requires admin/super_admin privileges and runs inside a single database transaction.
 */
export async function confirmAdminBookingAction(params: {
  bookingId: number
  depositAmount?: number
  currency?: string
  instrument?: string
}) {
  try {
    const session = await SessionResolver.resolve()
    if (
      !session.isAuthenticated ||
      (session.role !== 'admin' && session.role !== 'super_admin') ||
      !session.userId
    ) {
      return { success: false, error: 'Unauthorized. Admin access required.' }
    }

    const { booking } = await getDomainServices()
    const repository = booking.getRepository()

    // Start transaction
    const transactionId = await repository.beginTransaction()
    if (transactionId === null) {
      throw new Error('Failed to initiate transaction.')
    }
    const context: RequestContext = { transactionId }

    try {
      // 1. Fetch fresh booking inside transaction
      const bookingDoc = await repository.findById(params.bookingId, context)
      if (bookingDoc.status !== 'pending_admin_review') {
        throw new Error(
          `Booking is not in pending_admin_review status. Current status: ${bookingDoc.status}`,
        )
      }

      // 2. Validate deposit amount against fresh state
      const pricingSnapshot = bookingDoc.pricingSnapshot
      if (!pricingSnapshot) {
        throw new Error(
          `[confirmAdminBookingAction] Missing required pricingSnapshot for Booking #${bookingDoc.id}`,
        )
      }
      const totalAmount = pricingSnapshot.totalAmountEGP
      if (totalAmount === undefined || totalAmount === null || totalAmount < 0) {
        throw new Error(
          `[confirmAdminBookingAction] Invalid totalAmountEGP in pricingSnapshot for Booking #${bookingDoc.id}`,
        )
      }
      const amountPaid = bookingDoc.amountPaid
      if (amountPaid === undefined || amountPaid === null || amountPaid < 0) {
        throw new Error(
          `[confirmAdminBookingAction] Invalid amountPaid for Booking #${bookingDoc.id}`,
        )
      }
      const outstandingBalance = totalAmount - amountPaid

      const deposit = params.depositAmount || 0
      if (deposit < 0 || deposit > outstandingBalance) {
        throw new Error(`Invalid deposit amount. Must be between 0 and ${outstandingBalance}.`)
      }

      // 3. Record manual payment attempt if deposit is provided
      let updatedAttempts = bookingDoc.paymentAttempts
      if (deposit > 0) {
        const ref = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        updatedAttempts = PaymentAttemptsService.recordAttempt(bookingDoc.paymentAttempts, {
          provider: 'manual',
          amount: deposit,
          currency: 'EGP',
          status: 'successful',
          transactionReference: ref,
        })
      }

      // 4. Confirm booking inside transaction
      const confirmedBooking = await booking.confirm(
        params.bookingId,
        { id: session.userId.toString(), type: 'admin', name: 'Admin Panel' },
        context,
        updatedAttempts,
      )

      // 5. Commit transaction
      await repository.commitTransaction(transactionId)

      return { success: true }
    } catch (innerErr: any) {
      await repository.rollbackTransaction(transactionId)
      throw innerErr
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Confirmation failed',
    }
  }
}

/**
 * Server Action: Admin Cancel Booking.
 * Requires admin/super_admin privileges and runs inside a single database transaction.
 */
export async function cancelAdminBookingAction(params: { bookingId: number; reason?: string }) {
  try {
    const session = await SessionResolver.resolve()
    if (
      !session.isAuthenticated ||
      (session.role !== 'admin' && session.role !== 'super_admin') ||
      !session.userId
    ) {
      return { success: false, error: 'Unauthorized. Admin access required.' }
    }

    const { booking } = await getDomainServices()
    const repository = booking.getRepository()

    const transactionId = await repository.beginTransaction()
    if (transactionId === null) {
      throw new Error('Failed to initiate transaction.')
    }
    const context: RequestContext = { transactionId }

    try {
      // 1. Fetch fresh booking inside transaction
      const bookingDoc = await repository.findById(params.bookingId, context)
      if (bookingDoc.status !== 'pending_admin_review' && bookingDoc.status !== 'confirmed') {
        throw new Error(`Booking cannot be cancelled from current status: ${bookingDoc.status}`)
      }

      // 2. Cancel booking inside transaction
      await booking.cancel(
        params.bookingId,
        params.reason || 'Cancelled by admin review',
        { id: session.userId.toString(), type: 'admin', name: 'Admin Panel' },
        context,
      )

      await repository.commitTransaction(transactionId)
      return { success: true }
    } catch (innerErr: any) {
      await repository.rollbackTransaction(transactionId)
      throw innerErr
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cancellation failed',
    }
  }
}

/**
 * Server Action: Submit booking draft for admin review.
 * Requires admin/super_admin privileges and runs inside a single database transaction.
 */
export async function moveToPendingAdminReviewAction(params: { bookingId: number }) {
  try {
    const session = await SessionResolver.resolve()
    if (
      !session.isAuthenticated ||
      (session.role !== 'admin' && session.role !== 'super_admin') ||
      !session.userId
    ) {
      return { success: false, error: 'Unauthorized. Admin access required.' }
    }

    const { booking } = await getDomainServices()
    const repository = booking.getRepository()

    const transactionId = await repository.beginTransaction()
    if (transactionId === null) {
      throw new Error('Failed to initiate transaction.')
    }
    const context: RequestContext = { transactionId }

    try {
      // 1. Transition booking to pending review inside transaction
      await booking.moveToPendingAdminReview(params.bookingId, context)

      await repository.commitTransaction(transactionId)
      return { success: true }
    } catch (innerErr: any) {
      await repository.rollbackTransaction(transactionId)
      throw innerErr
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Submit for review failed',
    }
  }
}

/**
 * Server Action: Admin Record Subsequent Payment on a Confirmed Booking.
 * Requires admin/super_admin privileges and runs inside a transaction.
 */
export async function recordSubsequentPaymentAction(params: {
  bookingId: number
  amount: number
  instrument: string
}) {
  try {
    const session = await SessionResolver.resolve()
    if (
      !session.isAuthenticated ||
      (session.role !== 'admin' && session.role !== 'super_admin') ||
      !session.userId
    ) {
      return { success: false, error: 'Unauthorized. Admin access required.' }
    }

    const { booking } = await getDomainServices()
    const repository = booking.getRepository()

    const transactionId = await repository.beginTransaction()
    if (transactionId === null) {
      throw new Error('Failed to initiate transaction.')
    }
    const context: RequestContext = { transactionId }

    try {
      const bookingDoc = await repository.findById(params.bookingId, context)
      if (bookingDoc.status !== 'confirmed') {
        throw new Error(
          `Subsequent payment can only be recorded for confirmed bookings. Current status: ${bookingDoc.status}`,
        )
      }

      const outstanding = bookingDoc.outstandingBalance || 0
      if (params.amount <= 0 || params.amount > outstanding) {
        throw new Error(`Invalid payment amount. Must be between 0 and ${outstanding}.`)
      }

      const pricingSnapshot = bookingDoc.pricingSnapshot
      if (!pricingSnapshot) {
        throw new Error(
          `[recordSubsequentPaymentAction] Missing required pricingSnapshot for Booking #${bookingDoc.id}`,
        )
      }
      const totalAmountEGP = pricingSnapshot.totalAmountEGP
      if (totalAmountEGP === undefined || totalAmountEGP === null || totalAmountEGP < 0) {
        throw new Error(
          `[recordSubsequentPaymentAction] Invalid totalAmountEGP in pricingSnapshot for Booking #${bookingDoc.id}`,
        )
      }

      const ref = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const updatedAttempts = PaymentAttemptsService.recordAttempt(bookingDoc.paymentAttempts, {
        provider: 'manual',
        amount: params.amount,
        currency: 'EGP',
        status: 'successful',
        transactionReference: ref,
      })

      const paid = PaymentAttemptsService.getPaidAmount(updatedAttempts)
      const newOutstanding = PaymentAttemptsService.getOutstandingBalance(
        totalAmountEGP,
        updatedAttempts,
      )

      await repository.update(
        params.bookingId,
        {
          paymentAttempts: updatedAttempts,
          amountPaid: paid,
          outstandingBalance: newOutstanding,
          paymentStatus: newOutstanding === 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid',
        },
        context,
      )

      // Atomic Loyalty Earning on newly verified payment delta
      if (params.amount > 0) {
        const { loyalty } = await getDomainServices()
        await loyalty.earnPointsForBooking(
          bookingDoc.customerId,
          bookingDoc.id,
          params.amount,
          bookingDoc.bookingNumber,
          undefined,
          context,
          `sub_${ref}`,
        )
        await loyalty.evaluateAndUpgradeTier(
          bookingDoc.customerId,
          params.amount,
          undefined,
          context,
        )
      }

      await repository.commitTransaction(transactionId)
      return { success: true }
    } catch (innerErr: any) {
      await repository.rollbackTransaction(transactionId)
      throw innerErr
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record subsequent payment',
    }
  }
}

/**
 * Server Action: Admin Issue Refund.
 * Requires admin/super_admin privileges and runs inside a transaction.
 */
export async function refundAdminBookingAction(params: { bookingId: number; reason?: string }) {
  try {
    const session = await SessionResolver.resolve()
    if (
      !session.isAuthenticated ||
      (session.role !== 'admin' && session.role !== 'super_admin') ||
      !session.userId
    ) {
      return { success: false, error: 'Unauthorized. Admin access required.' }
    }

    const { booking } = await getDomainServices()
    const repository = booking.getRepository()

    const transactionId = await repository.beginTransaction()
    if (transactionId === null) {
      throw new Error('Failed to initiate transaction.')
    }
    const context: RequestContext = { transactionId }

    try {
      await booking.refund(
        params.bookingId,
        { id: session.userId.toString(), type: 'admin', name: 'Admin Panel' },
        context,
        params.reason,
      )

      await repository.commitTransaction(transactionId)
      return { success: true }
    } catch (innerErr: any) {
      await repository.rollbackTransaction(transactionId)
      throw innerErr
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund failed',
    }
  }
}
