import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
import type { PaymentCompletedEvent } from '../payment-events'
import type { CustomerRegisteredEvent } from '../customer-events'
import { NotificationService } from '../../notification/service'

/**
 * Multi-Domain Notification Subscriber
 * Listens to Booking, Payment, and Loyalty/Customer domain events and enqueues notifications idempotently.
 */
export function registerNotificationSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const notificationService = new NotificationService(payload)

  // 1. Customer Registered Event -> Enqueue welcome email (Decoupled)
  eventBus.subscribe<CustomerRegisteredEvent>('CUSTOMER_REGISTERED', async (event) => {
    try {
      console.log(`[NotificationSubscriber] Customer #${event.customerId} registered. Enqueuing welcome email...`)
      await notificationService.enqueueNotification({
        referenceType: 'WELCOME',
        referenceId: String(event.customerId),
        recipient: event.email,
        channel: 'email',
        category: 'marketing',
        priority: 'normal',
        templateId: 'welcome_email',
        translationKey: 'customer.welcome',
        templateData: { name: event.fullName || '' },
      })
      console.log(`[NotificationSubscriber] Welcome email enqueued successfully for customer #${event.customerId}.`)
    } catch (err: any) {
      console.error(`[NotificationSubscriber] Failed to enqueue welcome notification:`, err.message)
    }
  })

  // 2. Booking Confirmed Event
  eventBus.subscribe<BookingConfirmedEvent>('BOOKING_CONFIRMED', async (event) => {
    try {
      await notificationService.enqueueNotification({
        referenceType: 'BOOKING',
        referenceId: String(event.booking.id),
        recipient: 'customer@laube.com',
        channel: 'email',
        category: 'booking',
        priority: 'high',
        templateId: 'booking_confirmation',
        translationKey: 'booking.confirmed',
        templateData: { bookingNumber: event.booking.bookingNumber },
      })
    } catch (err: any) {
      console.error(`[NotificationSubscriber] Failed to enqueue booking confirmation notification:`, err.message)
    }
  })

  // 3. Payment Completed Event
  eventBus.subscribe<PaymentCompletedEvent>('PAYMENT_COMPLETED', async (event) => {
    try {
      await notificationService.enqueueNotification({
        referenceType: 'PAYMENT',
        referenceId: event.transactionId,
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
