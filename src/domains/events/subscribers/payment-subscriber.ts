import type { Payload } from 'payload'
import { BookingStatus, RequestContext } from '@/types'
import { EventBus } from '../event-bus'
import type { PaymentCompletedEvent } from '../payment-events'
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
          await booking.update(Number(bookingId), {
            status: BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY,
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

        // 4. POST-COMMIT DOMAIN EVENT DISPATCH: Publish event ONLY AFTER successful commit!
        const { booking: bookingDomain } = await getDomainServices()
        await bookingDomain.publishBookingConfirmedEvent(confirmedBooking)
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[BookingPaymentSubscriber] ❌ Transaction failed for event ${event.eventId as string}:`, err)
        throw err
      }
    },
  )
}
