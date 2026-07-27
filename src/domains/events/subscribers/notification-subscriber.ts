import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
import type { PaymentCompletedEvent } from '../payment-events'
import type { CustomerRegisteredEvent } from '../customer-events'
import { NotificationService } from '../../notification/service'
import { CustomerRepository } from '../../customer/repository'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'

/**
 * Multi-Domain Notification Subscriber
 * Listens to Booking, Payment, and Loyalty/Customer domain events and enqueues notifications idempotently.
 * Atomic Inbox Guard protected for Exactly-Once processing & Fail-Fast recipient validation.
 */
export function registerNotificationSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)
  const notificationService = new NotificationService(payload)
  const customerRepository = new CustomerRepository(payload)

  // 1. Customer Registered Event -> Enqueue welcome email
  eventBus.subscribe<CustomerRegisteredEvent>(
    'CUSTOMER_REGISTERED',
    'NotificationSubscriber.enqueueWelcomeNotification',
    async (event) => {
      const subscriberName = 'NotificationSubscriber.enqueueWelcomeNotification'
      if (!event.eventId)
        throw new Error(
          '[NotificationSubscriber] CustomerRegisteredEvent missing required eventId.',
        )

      const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName)
      if (!acquired) return

      if (!event.email)
        throw new Error(
          `[NotificationSubscriber] Missing required email for customer #${event.customerId}.`,
        )

      console.log(
        `[NotificationSubscriber] Customer #${event.customerId} registered. Enqueuing welcome email...`,
      )
      await notificationService.enqueueNotification({
        referenceType: 'WELCOME',
        referenceId: String(event.customerId),
        recipient: event.email,
        channel: 'email',
        category: 'marketing',
        priority: 'normal',
        templateId: 'welcome_email',
        translationKey: 'customer.welcome',
        templateData: { name: event.fullName },
      })
    },
  )

  // 2. Booking Confirmed Event -> Fetch customer email & enqueue confirmation
  eventBus.subscribe<BookingConfirmedEvent>(
    'BOOKING_CONFIRMED',
    'NotificationSubscriber.enqueueBookingConfirmation',
    async (event) => {
      const subscriberName = 'NotificationSubscriber.enqueueBookingConfirmation'
      if (!event.eventId)
        throw new Error('[NotificationSubscriber] BookingConfirmedEvent missing required eventId.')

      const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName)
      if (!acquired) return

      const customer = await customerRepository.findById(event.booking.customerId)
      if (!customer || !customer.email) {
        throw new Error(
          `[NotificationSubscriber] Customer #${event.booking.customerId} not found or missing email for booking confirmation.`,
        )
      }

      await notificationService.enqueueNotification({
        referenceType: 'BOOKING',
        referenceId: String(event.booking.id),
        recipient: customer.email,
        channel: 'email',
        category: 'booking',
        priority: 'high',
        templateId: 'booking_confirmation',
        translationKey: 'booking.confirmed',
        templateData: { bookingNumber: event.booking.bookingNumber },
      })
    },
  )

  // 3. Payment Completed Event -> Use event.customerEmail & enqueue receipt
  eventBus.subscribe<PaymentCompletedEvent>(
    'PAYMENT_COMPLETED',
    'NotificationSubscriber.enqueuePaymentReceipt',
    async (event) => {
      const subscriberName = 'NotificationSubscriber.enqueuePaymentReceipt'
      if (!event.eventId)
        throw new Error('[NotificationSubscriber] PaymentCompletedEvent missing required eventId.')

      const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName)
      if (!acquired) return

      let recipientEmail = event.customerEmail
      if (!recipientEmail) {
        const customer = await customerRepository.findById(event.customerId)
        if (!customer || !customer.email) {
          throw new Error(
            `[NotificationSubscriber] Customer #${event.customerId} missing email for payment receipt.`,
          )
        }
        recipientEmail = customer.email
      }

      await notificationService.enqueueNotification({
        referenceType: 'PAYMENT',
        referenceId: event.transactionId,
        recipient: recipientEmail,
        channel: 'email',
        category: 'payment',
        priority: 'high',
        templateId: 'payment_receipt',
        translationKey: 'payment.completed',
        templateData: { amount: event.amount, currency: event.currency },
      })
    },
  )
}

export const registerNotificationSubscriber = registerNotificationSubscribers
