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

      const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName)
      if (!acquired) {
        console.log(
          `[BookingPaymentSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`,
        )
        return
      }

      const bookingId = event.bookingId
      const { booking } = await getDomainServices()

      const paymentAttempt = {
        attemptId: event.attemptId || `pay_att_${event.transactionId}`,
        attemptNumber: event.attemptNumber || 1,
        provider: event.provider,
        amount: event.amount,
        currency: event.currency,
        status: 'successful' as const,
        transactionReference: event.gatewayReference || event.transactionId,
        timestamp: event.occurredAt || new Date().toISOString(),
      }

      // 1. Mark booking as paid in Booking Domain
      await booking.markAsPaid(bookingId, paymentAttempt)

      // 2. Confirm booking in Booking Domain
      await booking.confirm(bookingId)
    },
  )
}
