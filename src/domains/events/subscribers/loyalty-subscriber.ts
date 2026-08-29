import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent, BookingCancelledEvent, BookingRefundedEvent } from '../booking-events'
import type { PaymentRefundedEvent } from '../payment-events'
import type { LoyaltyService } from '../../loyalty/service'
import type { CustomerService } from '../../customer/service'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'
import type { Payload, PayloadRequest } from 'payload'
import type { RequestContext } from '@/types'
import type { Booking } from '@/payload-types'

/**
 * Customer Loyalty Subscriber
 * Listens to BookingConfirmedEvent to award points and evaluate tier progression via LoyaltyService.
 * Listens to BookingCancelledEvent and BookingRefundedEvent for Phase A (Redemption refund) & Phase B (Earn reversal).
 * Atomic Inbox Guard protected for Exactly-Once processing & Fail-Fast validation.
 */
export function registerLoyaltySubscriber(
  payload: Payload,
  customerService: CustomerService,
  loyaltyService: LoyaltyService,
): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)

  eventBus.subscribe<BookingConfirmedEvent>(
    'BOOKING_CONFIRMED',
    'LoyaltySubscriber.awardPointsOnBooking',
    async (event) => {
      const subscriberName = 'LoyaltySubscriber.awardPointsOnBooking'

      if (!event.eventId) {
        throw new Error('[LoyaltySubscriber] BookingConfirmedEvent missing required eventId.')
      }

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as unknown as PayloadRequest
      const context: RequestContext = { transactionId: transactionID }

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(
            `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`,
          )
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        const booking = event.booking
        const customerId = booking.customerId
        const qualifyingAmountEGP =
          typeof booking.amountPaid === 'number' && booking.amountPaid > 0 ? booking.amountPaid : 0

        console.log(
          `[LoyaltySubscriber] 🎁 Processing points for Customer #${customerId} for booking #${booking.id} (PaidAmount: ${qualifyingAmountEGP} EGP)`,
        )

        const customer = await customerService.getProfile(customerId)
        if (!customer) {
          throw new Error(
            `[LoyaltySubscriber] Data Corruption Exception: Customer #${customerId} not found for confirmed booking #${booking.id}.`,
          )
        }

        const pointsEarned =
          qualifyingAmountEGP > 0
            ? await loyaltyService.calculateEarnedPoints(qualifyingAmountEGP)
            : 0
        console.log(
          `[LoyaltySubscriber] Calculated earned points: ${pointsEarned} points for amount ${qualifyingAmountEGP} EGP.`,
        )

        if (pointsEarned > 0) {
          const ledgerRecord = await loyaltyService.earnPointsForBooking(
            customerId,
            booking.id,
            qualifyingAmountEGP,
            booking.bookingNumber,
            undefined,
            context,
          )
          await customerService.updateLoyaltyProfile(
            customerId,
            { points: ledgerRecord.resultingBalance },
            context,
          )
          console.log(
            `[LoyaltySubscriber] ✅ Earned ${pointsEarned} points successfully credited and projection updated to ${ledgerRecord.resultingBalance} for Customer #${customerId}.`,
          )
        } else {
          console.log(`[LoyaltySubscriber] ℹ️ Zero points earned for this booking (no paid cash amount).`)
        }

        if (qualifyingAmountEGP > 0) {
          console.log(`[LoyaltySubscriber] Evaluating tier upgrade for Customer #${customerId}...`)
          await loyaltyService.evaluateAndUpgradeTier(customerId, qualifyingAmountEGP, undefined, context)
          console.log(`[LoyaltySubscriber] ✅ Tier evaluation completed for Customer #${customerId}.`)
        }

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (error) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[LoyaltySubscriber] Failed processing booking confirmed event #${event.eventId}:`, error)
        throw error
      }
    },
  )

  eventBus.subscribe<BookingCancelledEvent>(
    'BOOKING_CANCELLED',
    'LoyaltySubscriber.processCancellation',
    async (event) => {
      if (!event.eventId) {
        throw new Error('[LoyaltySubscriber] BookingCancelledEvent missing required eventId.')
      }

      const booking = event.booking
      const customerId = booking.customerId
      const totalAmountEGP = booking.pricingSnapshot.totalAmountEGP

      // -----------------------------------------------------------------------------------
      // 1. Transaction A: Redemption Refund & Tier Restoration (Guaranteed & Isolated)
      // -----------------------------------------------------------------------------------
      const subscriberNameA = 'LoyaltySubscriber.processCancellation.PhaseA'
      const transactionA = await payload.db.beginTransaction()
      const reqA = { transactionID: transactionA } as unknown as PayloadRequest
      const contextA: RequestContext = { transactionId: transactionA }

      try {
        const acquiredA = await inboxRepo.tryAcquire(event.eventId, subscriberNameA, reqA)
        if (!acquiredA) {
          console.log(
            `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} Phase A already processed by ${subscriberNameA}. Skipping.`,
          )
          if (transactionA) await payload.db.rollbackTransaction(transactionA)
        } else {
          console.log(
            `[LoyaltySubscriber] 🗑️ Processing cancellation Phase A (Redemption Refund) for Customer #${customerId} on booking #${booking.id}...`,
          )

          await loyaltyService.processBookingRedemptionRefund(customerId, booking.id, totalAmountEGP, undefined, contextA)
          const balanceAfterA = await loyaltyService.getCustomerBalance(customerId, contextA)
          await customerService.updateLoyaltyProfile(
            customerId,
            { points: balanceAfterA },
            contextA,
          )

          if (transactionA) await payload.db.commitTransaction(transactionA)
          console.log(`[LoyaltySubscriber] ✅ Cancellation Phase A (Refund) successfully committed for Customer #${customerId}. Balance: ${balanceAfterA}`)
        }
      } catch (errorA) {
        if (transactionA) await payload.db.rollbackTransaction(transactionA)
        console.error(`[LoyaltySubscriber] ❌ Cancellation Phase A failed for event #${event.eventId}:`, errorA)
        throw errorA
      }

      // -----------------------------------------------------------------------------------
      // 2. Transaction B: Earned Points Reversal (Subject to spendable balance invariant)
      // -----------------------------------------------------------------------------------
      const subscriberNameB = 'LoyaltySubscriber.processCancellation.PhaseB'
      const transactionB = await payload.db.beginTransaction()
      const reqB = { transactionID: transactionB } as unknown as PayloadRequest
      const contextB: RequestContext = { transactionId: transactionB }

      try {
        const acquiredB = await inboxRepo.tryAcquire(event.eventId, subscriberNameB, reqB)
        if (!acquiredB) {
          console.log(
            `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} Phase B already processed by ${subscriberNameB}. Skipping.`,
          )
          if (transactionB) await payload.db.rollbackTransaction(transactionB)
          return
        }

        console.log(
          `[LoyaltySubscriber] 🗑️ Processing cancellation Phase B (Earn Reversal) for Customer #${customerId} on booking #${booking.id}...`,
        )

        await loyaltyService.processBookingEarnedReversal(customerId, booking.id, totalAmountEGP, undefined, contextB)
        const balanceAfterB = await loyaltyService.getCustomerBalance(customerId, contextB)
        await customerService.updateLoyaltyProfile(
          customerId,
          { points: balanceAfterB },
          contextB,
        )

        if (transactionB) await payload.db.commitTransaction(transactionB)
        console.log(`[LoyaltySubscriber] ✅ Cancellation Phase B (Earn Reversal) successfully committed for Customer #${customerId}. Final Balance: ${balanceAfterB}`)
      } catch (errorB) {
        if (transactionB) await payload.db.rollbackTransaction(transactionB)
        console.error(`[LoyaltySubscriber] ⚠️ Cancellation Phase B (Earn Reversal) failed for event #${event.eventId}:`, errorB)
        throw errorB
      }
    },
  )

  eventBus.subscribe<BookingRefundedEvent>(
    'BOOKING_REFUNDED',
    'LoyaltySubscriber.processBookingRefund',
    async (event) => {
      if (!event.eventId) {
        throw new Error('[LoyaltySubscriber] BookingRefundedEvent missing required eventId.')
      }

      const booking = event.booking
      const customerId = booking.customerId
      const totalAmountEGP = booking.pricingSnapshot.totalAmountEGP

      // -----------------------------------------------------------------------------------
      // 1. Transaction A: Redemption Refund & Spend Adjustment (Guaranteed & Isolated)
      // -----------------------------------------------------------------------------------
      const subscriberNameA = 'LoyaltySubscriber.processBookingRefund.PhaseA'
      const transactionA = await payload.db.beginTransaction()
      const reqA = { transactionID: transactionA } as unknown as PayloadRequest
      const contextA: RequestContext = { transactionId: transactionA }

      try {
        const acquiredA = await inboxRepo.tryAcquire(event.eventId, subscriberNameA, reqA)
        if (!acquiredA) {
          console.log(
            `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} Phase A already processed by ${subscriberNameA}. Skipping.`,
          )
          if (transactionA) await payload.db.rollbackTransaction(transactionA)
        } else {
          console.log(
            `[LoyaltySubscriber] 🔄 Processing refund Phase A (Redemption Refund) for Customer #${customerId} on booking #${booking.id}...`,
          )

          await loyaltyService.processBookingRedemptionRefund(customerId, booking.id, totalAmountEGP, undefined, contextA)
          const balanceAfterA = await loyaltyService.getCustomerBalance(customerId, contextA)
          await customerService.updateLoyaltyProfile(
            customerId,
            { points: balanceAfterA },
            contextA,
          )

          if (transactionA) await payload.db.commitTransaction(transactionA)
          console.log(`[LoyaltySubscriber] ✅ Refund Phase A successfully committed for Customer #${customerId}. Balance: ${balanceAfterA}`)
        }
      } catch (errorA) {
        if (transactionA) await payload.db.rollbackTransaction(transactionA)
        console.error(`[LoyaltySubscriber] ❌ Refund Phase A failed for event #${event.eventId}:`, errorA)
        throw errorA
      }

      // -----------------------------------------------------------------------------------
      // 2. Transaction B: Earned Points Reversal (Subject to spendable balance invariant)
      // -----------------------------------------------------------------------------------
      const subscriberNameB = 'LoyaltySubscriber.processBookingRefund.PhaseB'
      const transactionB = await payload.db.beginTransaction()
      const reqB = { transactionID: transactionB } as unknown as PayloadRequest
      const contextB: RequestContext = { transactionId: transactionB }

      try {
        const acquiredB = await inboxRepo.tryAcquire(event.eventId, subscriberNameB, reqB)
        if (!acquiredB) {
          console.log(
            `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} Phase B already processed by ${subscriberNameB}. Skipping.`,
          )
          if (transactionB) await payload.db.rollbackTransaction(transactionB)
          return
        }

        console.log(
          `[LoyaltySubscriber] 🔄 Processing refund Phase B (Earn Reversal) for Customer #${customerId} on booking #${booking.id}...`,
        )

        await loyaltyService.processBookingEarnedReversal(customerId, booking.id, totalAmountEGP, undefined, contextB)
        const balanceAfterB = await loyaltyService.getCustomerBalance(customerId, contextB)
        await customerService.updateLoyaltyProfile(
          customerId,
          { points: balanceAfterB },
          contextB,
        )

        if (transactionB) await payload.db.commitTransaction(transactionB)
        console.log(`[LoyaltySubscriber] ✅ Refund Phase B successfully committed for Customer #${customerId}. Final Balance: ${balanceAfterB}`)
      } catch (errorB) {
        if (transactionB) await payload.db.rollbackTransaction(transactionB)
        console.error(`[LoyaltySubscriber] ⚠️ Refund Phase B failed for event #${event.eventId}:`, errorB)
        throw errorB
      }
    },
  )

  eventBus.subscribe<PaymentRefundedEvent>(
    'PAYMENT_REFUNDED',
    'LoyaltySubscriber.processPartialRefund',
    async (event) => {
      const subscriberName = 'LoyaltySubscriber.processPartialRefund'

      if (!event.eventId) {
        throw new Error('[LoyaltySubscriber] PaymentRefundedEvent missing required eventId.')
      }

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as unknown as PayloadRequest
      const context: RequestContext = { transactionId: transactionID }

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(
            `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`,
          )
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        const bookingDoc = await payload.findByID({
          collection: 'bookings',
          id: event.bookingId,
          req,
        }) as unknown as Booking

        if (!bookingDoc) {
          throw new Error(`[LoyaltySubscriber] Booking #${event.bookingId} not found.`)
        }

        const customerId = typeof bookingDoc.user === 'object' ? bookingDoc.user.id : Number(bookingDoc.user)

        // DB Concurrency Row Lock: lock payment transaction, then customer
        const db = payload.db as unknown as { sessions?: Record<string, { db?: { session?: { client?: { query: Function } } } }> }
        const session = transactionID ? db.sessions?.[transactionID] : undefined
        const client = session?.db?.session?.client
        if (client && typeof client.query === 'function') {
          console.log(`[LoyaltySubscriber] Acquiring exclusive transactional row lock for Payment Transaction & Customer #${customerId}...`)
          await client.query('SELECT id FROM payment_transactions WHERE booking_id = $1 FOR UPDATE', [event.bookingId])
          await client.query('SELECT id FROM customers WHERE id = $1 FOR UPDATE', [customerId])
        }

        const paymentRes = await payload.find({
          collection: 'payment-transactions',
          where: {
            bookingId: { equals: event.bookingId },
          },
          req,
          limit: 1,
        })
        const paymentTx = paymentRes.docs[0]
        if (!paymentTx) {
          throw new Error(`[LoyaltySubscriber] Payment transaction not found for booking #${event.bookingId}`)
        }

        let cumulativeRefundedEGP = 0
        const exchangeRate = bookingDoc.pricingSnapshot?.exchangeRate || 1.0

        if (paymentTx.attempts && Array.isArray(paymentTx.attempts)) {
          for (const attempt of (paymentTx.attempts as unknown as Array<{ status: string; amount: number }>)) {
            if (attempt.status === 'successful' && attempt.amount < 0) {
              cumulativeRefundedEGP += Math.abs(attempt.amount) * exchangeRate
            }
          }
        }

        const originalTotalEGP = bookingDoc.pricingSnapshot?.totalAmountEGP || 0
        console.log(`[LoyaltySubscriber] Cumulative refunded: ${cumulativeRefundedEGP} EGP, OriginalTotal: ${originalTotalEGP} EGP. Calling processBookingPartialRefund...`)

        await loyaltyService.processBookingPartialRefund(
          customerId,
          event.bookingId,
          cumulativeRefundedEGP,
          originalTotalEGP,
          event.eventId,
          undefined,
          context,
        )

        const newBalance = await loyaltyService.getCustomerBalance(customerId, context)
        await customerService.updateLoyaltyProfile(
          customerId,
          { points: newBalance },
          context,
        )
        console.log(`[LoyaltySubscriber] ✅ Partial refund processing completed. Balance for Customer #${customerId}: ${newBalance}`)

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (error) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[LoyaltySubscriber] Failed processing payment refunded event #${event.eventId}:`, error)
        throw error
      }
    },
  )
}
