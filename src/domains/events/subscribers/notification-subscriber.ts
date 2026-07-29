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

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId as string, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

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
          recipient: event.email as string,
          channel: 'email',
          category: 'marketing',
          priority: 'normal',
          templateId: 'welcome_email',
          translationKey: 'customer.welcome',
          templateData: { name: event.fullName },
        }, req)

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[NotificationSubscriber] CUSTOMER_REGISTERED transaction failed for event ${event.eventId as string}:`, err)
        throw err
      }
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

      console.log(`[NotificationSubscriber] ✉️ BookingConfirmedEvent received. Enqueuing booking confirmation for Customer #${event.booking.customerId}...`);

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId as string, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          console.log(`[NotificationSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`);
          return
        }

        const customer = await customerRepository.findById(Number(event.booking.customerId), req)
        if (!customer || !customer.email) {
          throw new Error(
            `[NotificationSubscriber] Customer #${event.booking.customerId} not found or missing email for booking confirmation.`,
          )
        }

        console.log(`[NotificationSubscriber] Found customer email: ${customer.email}. Queueing notification...`);

        await notificationService.enqueueNotification({
          referenceType: 'BOOKING',
          referenceId: String(event.booking.id),
          recipient: customer.email,
          channel: 'email',
          category: 'booking',
          priority: 'high',
          templateId: 'booking_confirmation',
          translationKey: 'booking.confirmed',
          templateData: {
            bookingNumber: event.booking.bookingNumber,
            customerName: customer.fullName || 'Valued Customer',
          },
        }, req)

        if (transactionID) await payload.db.commitTransaction(transactionID)
        console.log(`[NotificationSubscriber] ✅ Successfully enqueued booking confirmation email for Booking #${event.booking.id}.`);
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[NotificationSubscriber] ❌ BOOKING_CONFIRMED transaction failed for event ${event.eventId as string}:`, err)
        throw err
      }
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

      console.log(`[NotificationSubscriber] ✉️ PAYMENT_COMPLETED received. Enqueuing payment receipt for Customer #${event.customerId}...`);

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId as string, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          console.log(`[NotificationSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`);
          return
        }

        let recipientEmail = event.customerEmail
        if (!recipientEmail) {
          const customer = await customerRepository.findById(Number(event.customerId), req)
          if (!customer || !customer.email) {
            throw new Error(
              `[NotificationSubscriber] Customer #${event.customerId} missing email for payment receipt.`,
            )
          }
          recipientEmail = customer.email
        }

        console.log(`[NotificationSubscriber] Found recipient email: ${recipientEmail}. Queueing receipt notification...`);

        await notificationService.enqueueNotification({
          referenceType: 'PAYMENT',
          referenceId: String(event.transactionId),
          recipient: recipientEmail as string,
          channel: 'email',
          category: 'payment',
          priority: 'high',
          templateId: 'payment_receipt',
          translationKey: 'payment.completed',
          templateData: { amount: event.amount, currency: event.currency },
        }, req)

        if (transactionID) await payload.db.commitTransaction(transactionID)
        console.log(`[NotificationSubscriber] ✅ Successfully enqueued payment receipt email for Transaction #${event.transactionId}.`);
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[NotificationSubscriber] ❌ PAYMENT_COMPLETED transaction failed for event ${event.eventId as string}:`, err)
        throw err
      }
    },
  )
}

export const registerNotificationSubscriber = registerNotificationSubscribers
