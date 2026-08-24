import type { Payload } from 'payload'
import { BookingStatus, RequestContext } from '@/types'
import { EventBus } from '../event-bus'
import type { PaymentCompletedEvent, PaymentRefundedEvent } from '../payment-events'
import { getDomainServices } from '../../factory'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'
import { BookingPolicy } from '../../booking/policy'

/**
 * Booking Payment Subscriber
 * Listens to PaymentCompletedEvent to mark booking as paid and execute confirmation workflow in the Booking Domain.
 * Fully decouples Payment Domain from Booking Domain with Atomic Inbox Idempotency Guard & Fail-Fast validation.
 */
export class BookingPaymentSubscriber {
  // dummy class if needed, or we just keep the function signature below
}

export function registerBookingPaymentSubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)

  eventBus.subscribe<PaymentCompletedEvent>(
    'PAYMENT_COMPLETED',
    'BookingPaymentSubscriber.markAsPaidAndConfirm',
    async (event) => {
      const subscriberName = 'BookingPaymentSubscriber.markAsPaidAndConfirm'

      if (!event.eventId) {
        throw new Error(
          '[BookingPaymentSubscriber] PaymentCompletedEvent missing required eventId.',
        )
      }

      if (!event.provider) {
        throw new Error(
          '[BookingPaymentSubscriber] PaymentCompletedEvent missing required provider.',
        )
      }

      console.log(`[BookingPaymentSubscriber] 💳 PAYMENT_COMPLETED received for Booking #${event.bookingId}. Processing booking status update...`);

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      const context: RequestContext = { transactionId: transactionID }
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId as string, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          console.log(
            `[BookingPaymentSubscriber] Idempotency Guard: Event ${event.eventId as string} already processed by ${subscriberName}. Skipping.`,
          )
          return
        }

        const bookingId = event.bookingId
        const { booking } = await getDomainServices()

        // Fetch current booking state inside the active transaction
        const currentBooking = await booking.getById(Number(bookingId), context)
        if (currentBooking.status === BookingStatus.CONFIRMED || currentBooking.status === BookingStatus.COMPLETED) {
          console.log(`[BookingPaymentSubscriber] Idempotency: Booking #${bookingId} is already ${currentBooking.status}. Skipping.`);
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        // Status Guard: Booking is already CANCELLED
        if (currentBooking.status === BookingStatus.CANCELLED) {
          console.warn(`[BookingPaymentSubscriber] Warning: Received payment for already CANCELLED Booking #${bookingId}. Recording payment attempt without reviving booking status.`)
          
          const paymentAttempt = {
            attemptId: event.attemptId || `pay_att_${event.transactionId}`,
            attemptNumber: (currentBooking.paymentAttempts?.length || 0) + 1,
            provider: event.provider as any,
            amount: event.amount,
            currency: event.currency,
            status: 'successful' as const,
            transactionReference: (event.gatewayReference || event.transactionId) as string,
            timestamp: event.occurredAt || new Date().toISOString(),
          }

          const updatedAttempts = [...(currentBooking.paymentAttempts || []), paymentAttempt]
          const metadata = currentBooking.metadata || {}
          metadata.latePaymentReceivedOnCancelled = true
          metadata.manualRefundRequired = true
          metadata.reconciliationNotes = 'payment_received_after_cancellation'

          await booking.update(Number(bookingId), {
            paymentAttempts: updatedAttempts,
            metadata,
          }, context)

          if (transactionID) {
            await payload.db.commitTransaction(transactionID)
            console.log(`[BookingPaymentSubscriber] ✅ Transaction committed successfully for CANCELLED Booking #${bookingId} (Recorded late payment).`);
          }
          return
        }

        const paymentAttempt = {
          attemptId: event.attemptId || `pay_att_${event.transactionId}`,
          attemptNumber: (currentBooking.paymentAttempts?.length || 0) + 1,
          provider: event.provider as any,
          amount: event.amount,
          currency: event.currency,
          status: 'successful' as const,
          transactionReference: (event.gatewayReference || event.transactionId) as string,
          timestamp: event.occurredAt || new Date().toISOString(),
        }

        // Check capacity hold expiration
        const isLatePayment = currentBooking.status === BookingStatus.EXPIRED || BookingPolicy.isPaymentLate(currentBooking, event.occurredAt)

        if (isLatePayment) {
          console.warn(`[BookingPaymentSubscriber] Late Payment: Booking #${bookingId} is in '${currentBooking.status}' status (or capacity hold expired). Transitioning to PAYMENT_RECEIVED_AFTER_EXPIRY.`)
          
          const updatedAttempts = [...(currentBooking.paymentAttempts || []), paymentAttempt]
          const metadata = currentBooking.metadata || {}
          metadata.paymentReceivedAfterExpiry = true
          metadata.manualRefundRequired = true
          metadata.reconciliationNotes = 'payment_received_after_expiry_or_hold_expired'

          // Transition directly to PAYMENT_RECEIVED_AFTER_EXPIRY without holding/releasing capacity or confirming
          await booking.transitionStatus(Number(bookingId), BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY, {
            paymentAttempts: updatedAttempts,
            metadata,
          }, context)

          if (transactionID) {
            await payload.db.commitTransaction(transactionID)
            console.log(`[BookingPaymentSubscriber] ✅ Transaction committed successfully for Booking #${bookingId} (Late Payment resolved to PAYMENT_RECEIVED_AFTER_EXPIRY).`);
          }
          return
        }

        // 1. Mark booking as paid in Booking Domain (transitions DRAFT/PENDING_PAYMENT to PAID)
        await booking.markAsPaid(Number(bookingId), paymentAttempt, context)

        // 2. Confirm booking in Booking Domain (updates status to CONFIRMED inside transaction T1)
        const confirmedBooking = await booking.confirm(Number(bookingId), undefined, context)

        // 3. COMMIT TRANSACTION FIRST: Persist status update to PostgreSQL disk officially!
        if (transactionID) {
          await payload.db.commitTransaction(transactionID)
          console.log(`[BookingPaymentSubscriber] ✅ Transaction committed successfully for Booking #${bookingId}.`);
        }
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[BookingPaymentSubscriber] ❌ Transaction failed for event ${event.eventId as string}:`, err)
        throw err
      }
    },
  )

  eventBus.subscribe<PaymentRefundedEvent>(
    'PAYMENT_REFUNDED',
    'BookingPaymentSubscriber.onPaymentRefunded',
    async (event) => {
      const subscriberName = 'BookingPaymentSubscriber.onPaymentRefunded'

      if (!event.eventId) {
        throw new Error(
          '[BookingPaymentSubscriber] PaymentRefundedEvent missing required eventId.',
        )
      }

      console.log(`[BookingPaymentSubscriber] 💸 PAYMENT_REFUNDED received for Booking #${event.bookingId}. Amount: ${event.amountRefunded} ${event.currency}.`);

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      const context: RequestContext = { transactionId: transactionID }
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId as string, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          console.log(
            `[BookingPaymentSubscriber] Idempotency Guard: Event ${event.eventId as string} already processed by ${subscriberName}. Skipping.`,
          )
          return
        }

        const bookingId = event.bookingId
        const { booking, payment } = await getDomainServices()

        // 1. Load current booking state inside the active transaction context
        const currentBooking = await booking.getById(Number(bookingId), context)

        // If booking is already refunded or cancelled, skip
        if (currentBooking.status === BookingStatus.REFUNDED || currentBooking.status === BookingStatus.CANCELLED) {
          console.log(`[BookingPaymentSubscriber] Booking #${bookingId} is already in state '${currentBooking.status}'. Skipping.`);
          if (transactionID) await payload.db.commitTransaction(transactionID)
          return
        }

        // 2. Fetch payment transactions for this booking to calculate if this is a FULL refund
        const tx = await payment.getByTransactionId(event.transactionId)
        if (!tx) {
          throw new Error(`[BookingPaymentSubscriber] Transaction ${event.transactionId} not found.`)
        }

        // Let's sum the successful attempts vs refunded attempts
        const successfulAmount = tx.attempts
          .filter((a: any) => a.status === 'successful' && a.amount > 0)
          .reduce((sum: number, a: any) => sum + a.amount, 0)

        const refundedAmount = tx.attempts
          .filter((a: any) => a.status === 'successful' && a.amount < 0)
          .reduce((sum: number, a: any) => sum + Math.abs(a.amount), 0)

        // In this codebase, because any refund transaction sets the status to 'refunded', it represents a FULL refund (as partial refund logic is not yet active).
        const isFullRefund = tx.status === 'refunded' || (successfulAmount > 0 && refundedAmount >= successfulAmount)

        if (isFullRefund) {
          console.log(`[BookingPaymentSubscriber] Transaction status is 'refunded'. Processing FULL refund for Booking #${bookingId}...`);
          // Execute refund workflow in Booking Domain
          await booking.refund(Number(bookingId), { id: 'system', type: 'system', name: 'Refund Worker' }, context)
        } else {
          console.log(`[BookingPaymentSubscriber] Transaction status is '${tx.status}' (not 'refunded'). Skipping booking status transition for partial refund.`);
        }

        if (transactionID) {
          await payload.db.commitTransaction(transactionID)
          console.log(`[BookingPaymentSubscriber] ✅ Transaction committed successfully for Booking #${bookingId} refund processing.`);
        }
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[BookingPaymentSubscriber] ❌ Transaction failed for event ${event.eventId as string}:`, err)
        throw err
      }
    },
  )
}
