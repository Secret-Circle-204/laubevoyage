import type { Payload } from 'payload'
import { BookingStatus } from '@/types'
import { BookingPolicy } from '../../booking/policy'
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

  // 1. Booking Confirmed Event -> Fetch customer email & enqueue rich confirmation
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
          `[NotificationSubscriber] Found customer email: ${customer.email}. Resolving rich confirmation payload...`,
        )

        // 1. Resolve Experience details (title, destination, cover image, duration)
        let experienceTitle: string | undefined
        let destinationName: string | undefined
        let durationText: string | undefined
        let coverImageUrl: string | undefined

        try {
          const expDoc = (await payload.findByID({
            collection: 'experiences',
            id: event.booking.experienceId,
            depth: 1,
            req,
          })) as any

          if (expDoc) {
            experienceTitle = expDoc.title
            if (expDoc.city && typeof expDoc.city === 'object') {
              destinationName = expDoc.city.name
            }
            if (expDoc.duration?.days) {
              durationText = `${expDoc.duration.days} Days`
            }
            if (expDoc.hero && typeof expDoc.hero === 'object' && expDoc.hero.url) {
              const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || ''
              coverImageUrl = expDoc.hero.url.startsWith('http')
                ? expDoc.hero.url
                : `${serverUrl}${expDoc.hero.url}`
            }
          }
        } catch (expErr) {
          console.warn(
            `[NotificationSubscriber] Could not fetch experience #${event.booking.experienceId} details for confirmation email:`,
            expErr,
          )
        }

        // 2. Resolve Stays and Accommodation details
        const stays =
          event.booking.pricingSnapshot?.commercialBreakdown?.staysBreakdown?.map((s) => ({
            propertyName: s.propertyName,
            nights: s.nights,
            roomCategory: s.roomCategory,
            boardBasis: s.boardBasis,
          })) || []

        const roomCount = event.booking.pricingSnapshot?.commercialBreakdown?.roomCount || 1

        const adultsCount =
          event.booking.pricingSnapshot?.commercialBreakdown?.adultsCount ||
          event.booking.travelers?.length ||
          1
        const travelersSummary = `${adultsCount} Adults`
        const travelerNames =
          event.booking.travelers
            ?.map((t) => `${t.firstName || ''} ${t.lastName || ''}`.trim())
            .filter(Boolean) || []

        // 4. Resolve Dynamic Financial Status
        const snap = event.booking.pricingSnapshot
        const currency = snap?.displayCurrency || 'GBP'
        const totalAmount =
          snap?.displayAmount !== undefined
            ? Number(snap.displayAmount)
            : Number(snap?.totalAmountEGP || 0)
        const rate = snap?.exchangeRate || 1

        const paidRaw = event.booking.amountPaid ?? 0
        const outstandingRaw = event.booking.outstandingBalance ?? 0

        const amountPaid = snap?.displayAmount !== undefined ? paidRaw * rate : paidRaw
        const remainingBalance = snap?.displayAmount !== undefined ? outstandingRaw * rate : outstandingRaw

        let financialStatus: 'paid_in_full' | 'deposit_paid' | 'pending' = 'pending'
        if (outstandingRaw <= 0 || (paidRaw > 0 && paidRaw >= (snap?.totalAmountEGP || totalAmount))) {
          financialStatus = 'paid_in_full'
        } else if (paidRaw > 0 && outstandingRaw > 0) {
          financialStatus = 'deposit_paid'
        }

        // 5. Resolve Loyalty Points Used (Redemption discount only)
        const pointsUsed = event.booking.pointHold?.pointsHeld || 0
        const pointsDiscountRaw = event.booking.pointHold?.valueEGP || snap?.loyaltyDiscountEGP || 0
        const pointsDiscount =
          snap?.displayAmount !== undefined ? pointsDiscountRaw * rate : pointsDiscountRaw

        // 6. Actionable CTA URL
        const appServerUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || 'https://laubevoyage.com'
        const ctaUrl = `${appServerUrl}/booking/confirmation/${event.booking.bookingNumber}`

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
              customerName: customer.fullName || 'Valued Guest',
              locale: customer.preferredLanguage || 'en',
              startDate: event.booking.startDate,
              endDate: event.booking.endDate,
              travelersCount: event.booking.travelers?.length || 1,
              adultsCount,
              travelersSummary,
              travelerNames,
              experienceTitle: experienceTitle || 'Bespoke Luxury Journey',
              destinationName: destinationName || 'Egypt',
              durationText: durationText || '',
              coverImageUrl: coverImageUrl || '',
              stays,
              roomCount,
              currency,
              totalAmount,
              amountPaid,
              remainingBalance,
              financialStatus,
              pointsUsed,
              pointsDiscount,
              ctaUrl,
            },
          },
          req,
        )

        if (transactionID) await payload.db.commitTransaction(transactionID)
        console.log(
          `[NotificationSubscriber] ✅ Successfully enqueued rich booking confirmation email for Booking #${event.booking.id}.`,
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

  // 3. Payment Completed Event -> Use event.customerEmail & enqueue receipt (for non-booking transactions)
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

        // Unified Booking Notification Architecture:
        // When payment is linked to a booking (event.bookingId is present), check if the booking will
        // canonically trigger (or has triggered) the comprehensive Journey Confirmation email upon BOOKING_CONFIRMED.
        // Standalone payment_receipt is suppressed ONLY if the booking is confirmed or confirmable.
        // If the booking is in an exceptional state (e.g. CANCELLED, EXPIRED, late payment), standalone payment_receipt
        // is preserved so the customer is not left with zero communication after a successful charge.
        if (event.bookingId) {
          let isConfirmableOrConfirmed = false
          try {
            const bookingDoc = (await payload.findByID({
              collection: 'bookings',
              id: event.bookingId,
              depth: 0,
              req,
            })) as any

            if (bookingDoc) {
              const status = bookingDoc.status
              const isLate =
                status === BookingStatus.EXPIRED ||
                status === BookingStatus.PAYMENT_RECEIVED_AFTER_EXPIRY ||
                (bookingDoc.paymentWindowExpiresAt
                  ? BookingPolicy.isPaymentLate(bookingDoc as any, event.occurredAt)
                  : false)

              if (
                status === BookingStatus.CONFIRMED ||
                ((status === BookingStatus.DRAFT || status === BookingStatus.PENDING_PAYMENT) &&
                  !isLate)
              ) {
                isConfirmableOrConfirmed = true
              }
            }
          } catch (lookupErr) {
            console.warn(
              `[NotificationSubscriber] Could not inspect booking #${event.bookingId} status during payment receipt resolution:`,
              lookupErr,
            )
          }

          if (isConfirmableOrConfirmed) {
            if (transactionID) await payload.db.commitTransaction(transactionID)
            console.log(
              `[NotificationSubscriber] Unified Notification Flow: Suppressing redundant payment_receipt for confirmable Booking #${event.bookingId}. Confirmation and payment details are consolidated into canonical Journey Confirmation email.`,
            )
            return
          }

          console.warn(
            `[NotificationSubscriber] Exceptional Payment Flow: Booking #${event.bookingId} is in non-confirmable state. Preserving standalone payment_receipt to prevent customer communication gap.`,
          )
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
