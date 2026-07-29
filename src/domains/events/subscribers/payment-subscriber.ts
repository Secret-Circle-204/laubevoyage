import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { PaymentCompletedEvent } from '../payment-events'
import { getDomainServices } from '../../factory'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'

/**
 * Booking Payment Subscriber
 * Listens to PaymentCompletedEvent to mark booking as paid and execute confirmation workflow in the Booking Domain.
 * Fully decouples Payment Domain from Booking Domain with Atomic Inbox Idempotency Guard & Fail-Fast validation.
 */
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

        const paymentAttempt = {
          attemptId: event.attemptId || `pay_att_${event.transactionId}`,
          attemptNumber: event.attemptNumber || 1,
          provider: event.provider as any,
          amount: event.amount,
          currency: event.currency,
          status: 'successful' as const,
          transactionReference: (event.gatewayReference || event.transactionId) as string,
          timestamp: event.occurredAt || new Date().toISOString(),
        }

        // 1. Mark booking as paid in Booking Domain
        await booking.markAsPaid(Number(bookingId), paymentAttempt, req)

        // 2. Confirm booking in Booking Domain (updates status to CONFIRMED inside transaction T1)
        const confirmedBooking = await booking.confirm(Number(bookingId), undefined, req)

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
