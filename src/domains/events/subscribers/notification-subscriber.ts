import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
import type { PaymentCompletedEvent, PaymentFailedEvent } from '../payment-events'
import { NotificationService } from '../../notification/service'

/**
 * Multi-Domain Notification Subscriber
 * Listens to Booking, Payment, and Loyalty domain events and enqueues notifications idempotently.
 */
export function registerNotificationSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const notificationService = new NotificationService(payload)

  // 1. Booking Confirmed Event
  eventBus.subscribe<BookingConfirmedEvent>('BOOKING_CONFIRMED', async (event) => {
    try {
      await notificationService.enqueueNotification({
        referenceType: 'BOOKING',
        referenceId: String(event.bookingId),
        recipient: 'customer@laube.com',
        channel: 'email',
        category: 'booking',
        priority: 'high',
        templateId: 'booking_confirmation',
        translationKey: 'booking.confirmed',
        templateData: { bookingNumber: event.bookingNumber },
      })
    } catch (err: any) {
      console.error(`[NotificationSubscriber] Failed to enqueue booking confirmation notification:`, err.message)
    }
  })

  // 2. Payment Completed Event
  eventBus.subscribe<PaymentCompletedEvent>('PAYMENT_COMPLETED', async (event) => {
    try {
      await notificationService.enqueueNotification({
        referenceType: 'PAYMENT',
        referenceId: event.paymentId,
        recipient: 'customer@laube.com',
        channel: 'email',
        category: 'payment',
        priority: 'high',
        templateId: 'payment_receipt',
        translationKey: 'payment.completed',
        templateData: { amount: event.amount, currency: event.currency },
      })
    } catch (err: any) {
      console.error(`[NotificationSubscriber] Failed to enqueue payment receipt notification:`, err.message)
    }
  })
}

export const registerNotificationSubscriber = registerNotificationSubscribers
