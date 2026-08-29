import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent, BookingPendingAdminReviewEvent } from '../booking-events'
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

  // 1. Booking Confirmed Event -> Fetch customer email & enqueue confirmation
  eventBus.subscribe<BookingConfirmedEvent>(
    'BOOKING_CONFIRMED',
    'NotificationSubscriber.enqueueBookingConfirmation',
    async (event) => {
      const subscriberName = 'NotificationSubscriber.enqueueBookingConfirmation'
      if (!event.eventId)
        throw new Error('[NotificationSubscriber] BookingConfirmedEvent missing required eventId.')

      console.log(
        `[NotificationSubscriber] ✉️ BookingConfirmedEvent received. Enqueuing booking confirmation for Customer #${event.booking.customerId}...`,
      )

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId as string, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          console.log(
            `[NotificationSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`,
          )
          return
        }

        const customer = await customerRepository.findById(Number(event.booking.customerId), req)
        if (!customer || !customer.email) {
          throw new Error(
            `[NotificationSubscriber] Customer #${event.booking.customerId} not found or missing email for booking confirmation.`,
          )
        }

        console.log(
          `[NotificationSubscriber] Found customer email: ${customer.email}. Queueing notification...`,
        )

        await notificationService.enqueueNotification(
          {
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
          },
          req,
        )

        if (transactionID) await payload.db.commitTransaction(transactionID)
        console.log(
          `[NotificationSubscriber] ✅ Successfully enqueued booking confirmation email for Booking #${event.booking.id}.`,
        )
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(
          `[NotificationSubscriber] ❌ BOOKING_CONFIRMED transaction failed for event ${event.eventId as string}:`,
          err,
        )
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

      console.log(
        `[NotificationSubscriber] ✉️ PAYMENT_COMPLETED received. Enqueuing payment receipt for Customer #${event.customerId}...`,
      )

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId as string, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          console.log(
            `[NotificationSubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`,
          )
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

        console.log(
          `[NotificationSubscriber] Found recipient email: ${recipientEmail}. Queueing receipt notification...`,
        )

        await notificationService.enqueueNotification(
          {
            referenceType: 'PAYMENT',
            referenceId: String(event.transactionId),
            recipient: recipientEmail as string,
            channel: 'email',
            category: 'payment',
            priority: 'high',
            templateId: 'payment_receipt',
            translationKey: 'payment.completed',
            templateData: { amount: event.amount, currency: event.currency },
          },
          req,
        )

        if (transactionID) await payload.db.commitTransaction(transactionID)
        console.log(
          `[NotificationSubscriber] ✅ Successfully enqueued payment receipt email for Transaction #${event.transactionId}.`,
        )
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(
          `[NotificationSubscriber] ❌ PAYMENT_COMPLETED transaction failed for event ${event.eventId as string}:`,
          err,
        )
        throw err
      }
    },
  )

  // 4. Booking Pending Admin Review Event -> (A) Customer Acknowledgement & (B) Operations Alert
  eventBus.subscribe<BookingPendingAdminReviewEvent>(
    'BOOKING_PENDING_ADMIN_REVIEW',
    'NotificationSubscriber.enqueuePendingReviewNotifications',
    async (event) => {
      if (!event.eventId)
        throw new Error(
          '[NotificationSubscriber] BookingPendingAdminReviewEvent missing required eventId.',
        )

      console.log(
        `[NotificationSubscriber] ✉️ BOOKING_PENDING_ADMIN_REVIEW received for Booking #${event.booking.bookingNumber}...`,
      )

      // --- Handler A: Customer Reservation Request Acknowledgement ---
      const customerSubscriberName = 'NotificationSubscriber.enqueueBNPLCustomerAcknowledgement'
      const customerTx = await payload.db.beginTransaction()
      const customerReq = { transactionID: customerTx } as any
      try {
        const acquired = await inboxRepo.tryAcquire(
          event.eventId as string,
          customerSubscriberName,
          customerReq,
        )
        if (acquired) {
          let customerEmail = event.booking.travelers?.[0]?.email
          let customerName = event.booking.travelers?.[0]?.firstName
            ? `${event.booking.travelers[0].firstName} ${event.booking.travelers[0].lastName || ''}`.trim()
            : undefined

          if (!customerEmail && event.booking.customerId) {
            const customer = await customerRepository.findById(
              Number(event.booking.customerId),
              customerReq,
            )
            if (customer?.email) {
              customerEmail = customer.email
              customerName = customer.fullName || customerName
            }
          }

          if (customerEmail) {
            const snap = event.booking.pricingSnapshot
            const totalCost =
              snap?.displayAmount && snap?.displayCurrency
                ? `${snap.displayCurrency} ${Number(snap.displayAmount).toLocaleString()}`
                : `${(snap?.totalAmountEGP || 0).toLocaleString()} EGP`

            console.log(
              `[NotificationSubscriber] Queueing customer acknowledgement email to ${customerEmail}...`,
            )
            await notificationService.enqueueNotification(
              {
                referenceType: 'BOOKING',
                referenceId: String(event.booking.id),
                recipient: customerEmail,
                channel: 'email',
                category: 'booking',
                priority: 'high',
                templateId: 'booking_pending_admin_review',
                translationKey: 'booking.pending_admin_review',
                templateData: {
                  bookingNumber: event.booking.bookingNumber,
                  customerName: customerName,
                  departureDate: event.booking.startDate,
                  passengersCount: event.booking.travelers?.length,
                  totalCost,
                },
              },
              customerReq,
            )
          } else {
            console.warn(
              `[NotificationSubscriber] ⚠️ Cannot resolve customer email for Booking #${event.booking.bookingNumber}. Skipping customer acknowledgement.`,
            )
          }

          if (customerTx) await payload.db.commitTransaction(customerTx)
        } else {
          if (customerTx) await payload.db.rollbackTransaction(customerTx)
          console.log(
            `[NotificationSubscriber] Idempotency Guard: Customer acknowledgement already processed for event ${event.eventId}. Skipping.`,
          )
        }
      } catch (err: unknown) {
        if (customerTx) await payload.db.rollbackTransaction(customerTx)
        console.error(
          `[NotificationSubscriber] ❌ Customer acknowledgement failed for event ${event.eventId}:`,
          err,
        )
      }

      // --- Handler B: Operations / Admin Review Alert (Per Configured Recipient) ---
      const adminRecipients = await notificationService.getBookingNotificationRecipients()
      if (adminRecipients.length === 0) {
        throw new Error(
          `[NotificationSubscriber] No booking notification recipients configured in SystemSettings for Booking #${event.booking.bookingNumber}. Holding event in Outbox retry schedule.`,
        )
      }

      const snap = event.booking.pricingSnapshot
      const totalAmount =
        snap?.displayAmount && snap?.displayCurrency
          ? `${snap.displayCurrency} ${Number(snap.displayAmount).toLocaleString()}`
          : `${(snap?.totalAmountEGP || 0).toLocaleString()} EGP`

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const adminBookingUrl = `${appUrl}/admin/collections/bookings/${event.booking.id}`

      const failedRecipients: string[] = []
      for (const recipient of adminRecipients) {
        const adminSubscriberName = `NotificationSubscriber.enqueueBNPLAdminAlert:${recipient}`
        const adminTx = await payload.db.beginTransaction()
        const adminReq = { transactionID: adminTx } as any
        try {
          const acquired = await inboxRepo.tryAcquire(
            event.eventId as string,
            adminSubscriberName,
            adminReq,
          )
          if (!acquired) {
            if (adminTx) await payload.db.rollbackTransaction(adminTx)
            console.log(
              `[NotificationSubscriber] Idempotency Guard: Admin alert for ${recipient} already processed for event ${event.eventId}. Skipping.`,
            )
            continue
          }

          console.log(`[NotificationSubscriber] Queueing admin review alert to ${recipient}...`)
          await notificationService.enqueueNotification(
            {
              referenceType: 'BOOKING_ADMIN_ALERT',
              referenceId: String(event.booking.id),
              recipient,
              channel: 'email',
              category: 'booking',
              priority: 'high',
              templateId: 'admin_bnpl_review_alert',
              translationKey: 'admin.bnpl_review_alert',
              templateData: {
                bookingNumber: event.booking.bookingNumber,
                customerName: event.booking.travelers?.[0]?.firstName
                  ? `${event.booking.travelers[0].firstName} ${event.booking.travelers[0].lastName || ''}`.trim()
                  : undefined,
                customerEmail: event.booking.travelers?.[0]?.email,
                departureDate: event.booking.startDate,
                passengersCount: event.booking.travelers?.length,
                totalAmount,
                adminBookingUrl,
              },
            },
            adminReq,
          )

          if (adminTx) await payload.db.commitTransaction(adminTx)
          console.log(
            `[NotificationSubscriber] ✅ Successfully enqueued admin alert email to ${recipient} for Booking #${event.booking.id}.`,
          )
        } catch (err: unknown) {
          if (adminTx) await payload.db.rollbackTransaction(adminTx)
          console.error(
            `[NotificationSubscriber] ❌ Admin alert failed for ${recipient} on event ${event.eventId}:`,
            err,
          )
          failedRecipients.push(recipient)
        }
      }

      if (failedRecipients.length > 0) {
        throw new Error(
          `[NotificationSubscriber] Admin alert delivery partially failed for recipients: ${failedRecipients.join(', ')} on Booking #${event.booking.bookingNumber}.`,
        )
      }
    },
  )
}

export const registerNotificationSubscriber = registerNotificationSubscribers
