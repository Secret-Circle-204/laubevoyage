import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent, BookingCancelledEvent } from '../booking-events'
import type { LoyaltyService } from '../../loyalty/service'
import type { CustomerService } from '../../customer/service'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'
import type { Payload, PayloadRequest } from 'payload'
import type { RequestContext } from '@/types'

/**
 * Customer Loyalty Subscriber
 * Listens to BookingConfirmedEvent to award points and evaluate tier progression via LoyaltyService.
 * Atomic Inbox Guard protected for Exactly-Once processing & Fail-Fast validation.
 */
export function registerLoyaltySubscriber(
  payload: Payload,
  customerService: CustomerService,
  loyaltyService: LoyaltyService,
): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)

  eventBus.subscribe<BookingConfirmedEvent>(
    'BOOKING_CONFIRMED',
    'LoyaltySubscriber.awardPointsOnBooking',
    async (event) => {
      const subscriberName = 'LoyaltySubscriber.awardPointsOnBooking'

      if (!event.eventId) {
        throw new Error('[LoyaltySubscriber] BookingConfirmedEvent missing required eventId.')
      }

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as unknown as PayloadRequest
      const context: RequestContext = { transactionId: transactionID }

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(
            `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`,
          )
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        const booking = event.booking
        const customerId = booking.customerId
        const totalAmountEGP = booking.pricingSnapshot.totalAmountEGP

        console.log(`[LoyaltySubscriber] 🎁 Processing points for Customer #${customerId} for booking #${booking.id} (BookingAmount: ${totalAmountEGP} EGP)`)

        const customer = await customerService.getProfile(customerId)
        if (!customer) {
          throw new Error(
            `[LoyaltySubscriber] Data Corruption Exception: Customer #${customerId} not found for confirmed booking #${booking.id}.`,
          )
        }

        const pointsEarned = await loyaltyService.calculateEarnedPoints(totalAmountEGP)
        console.log(`[LoyaltySubscriber] Calculated earned points: ${pointsEarned} points for amount ${totalAmountEGP} EGP.`)

        if (pointsEarned > 0) {
          const ledgerRecord = await loyaltyService.earnPointsForBooking(
            customerId,
            booking.id,
            totalAmountEGP,
            booking.bookingNumber,
            undefined,
            context,
          )
          await customerService.updateLoyaltyProfile(
            customerId,
            { points: ledgerRecord.resultingBalance },
            context,
          )
          console.log(`[LoyaltySubscriber] ✅ Earned ${pointsEarned} points successfully credited and projection updated to ${ledgerRecord.resultingBalance} for Customer #${customerId}.`)
        } else {
          console.log(`[LoyaltySubscriber] ℹ️ Zero points earned for this booking.`)
        }

        console.log(`[LoyaltySubscriber] Evaluating tier upgrade for Customer #${customerId}...`)
        await loyaltyService.evaluateAndUpgradeTier(customerId, totalAmountEGP, undefined, context)
        console.log(`[LoyaltySubscriber] ✅ Tier evaluation completed for Customer #${customerId}.`)

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (error) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[LoyaltySubscriber] Failed processing booking confirmed event #${event.eventId}:`, error)
        throw error
      }
    },
  )

  eventBus.subscribe<BookingCancelledEvent>(
    'BOOKING_CANCELLED',
    'LoyaltySubscriber.processCancellation',
    async (event) => {
      const subscriberName = 'LoyaltySubscriber.processCancellation'

      if (!event.eventId) {
        throw new Error('[LoyaltySubscriber] BookingCancelledEvent missing required eventId.')
      }

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as unknown as PayloadRequest
      const context: RequestContext = { transactionId: transactionID }

      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(
            `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`,
          )
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        const booking = event.booking
        const customerId = booking.customerId
        const totalAmountEGP = booking.pricingSnapshot.totalAmountEGP

        console.log(
          `[LoyaltySubscriber] 🗑️ Processing cancellation for Customer #${customerId} for booking #${booking.id} (${totalAmountEGP} EGP)...`,
        )

        await loyaltyService.processBookingCancellation(customerId, booking.id, totalAmountEGP, undefined, context)
        const newBalance = await loyaltyService.getCustomerBalance(customerId, context)
        await customerService.updateLoyaltyProfile(
          customerId,
          { points: newBalance },
          context,
        )
        console.log(`[LoyaltySubscriber] ✅ Cancellation processing completed and projection updated to ${newBalance} for Customer #${customerId}.`)

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (error) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(`[LoyaltySubscriber] Failed processing booking cancelled event #${event.eventId}:`, error)
        throw error
      }
    },
  )
}
