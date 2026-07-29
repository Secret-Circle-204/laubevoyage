import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
import { LoyaltyService } from '../../loyalty/service'
import { CustomerService } from '../../customer/service'
import { CustomerRepository } from '../../customer/repository'
import { LoyaltyRepository } from '../../loyalty/repository'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'
import type { Payload } from 'payload'

/**
 * Customer Loyalty Subscriber
 * Listens to BookingConfirmedEvent to award points and evaluate tier progression via LoyaltyService.
 * Atomic Inbox Guard protected for Exactly-Once processing & Fail-Fast validation.
 */
export function registerLoyaltySubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)
  const loyaltyRepository = new LoyaltyRepository(payload)
  const customerRepository = new CustomerRepository(payload)
  const loyaltyService = new LoyaltyService(loyaltyRepository)
  const customerService = new CustomerService(customerRepository)

  eventBus.subscribe<BookingConfirmedEvent>(
    'BOOKING_CONFIRMED',
    'LoyaltySubscriber.awardPointsOnBooking',
    async (event) => {
      const subscriberName = 'LoyaltySubscriber.awardPointsOnBooking'

      if (!event.eventId) {
        throw new Error('[LoyaltySubscriber] BookingConfirmedEvent missing required eventId.')
      }

      const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName)
      if (!acquired) {
        console.log(
          `[LoyaltySubscriber] Idempotency Guard: Event ${event.eventId} already processed by ${subscriberName}. Skipping.`,
        )
        return
      }

      const booking = event.booking
      const customerId = booking.customerId
      const totalAmountEGP = booking.pricingSnapshot.totalAmountEGP

      console.log(`[LoyaltySubscriber] 🎁 Processing points for Customer #${customerId} for booking #${booking.id} (BookingAmount: ${totalAmountEGP} EGP)`);

      const customer = await customerService.getProfile(customerId)
      if (!customer) {
        throw new Error(
          `[LoyaltySubscriber] Data Corruption Exception: Customer #${customerId} not found for confirmed booking #${booking.id}.`,
        )
      }

      const pointsEarned = await loyaltyService.calculateEarnedPoints(totalAmountEGP)
      console.log(`[LoyaltySubscriber] Calculated earned points: ${pointsEarned} points for amount ${totalAmountEGP} EGP.`);

      if (pointsEarned > 0) {
        await loyaltyService.earnPointsForBooking(
          customerId,
          booking.id,
          totalAmountEGP,
          booking.bookingNumber,
        )
        console.log(`[LoyaltySubscriber] ✅ Earned ${pointsEarned} points successfully credited to Customer #${customerId}.`);
      } else {
        console.log(`[LoyaltySubscriber] ℹ️ Zero points earned for this booking.`);
      }

      console.log(`[LoyaltySubscriber] Evaluating tier upgrade for Customer #${customerId}...`);
      await loyaltyService.evaluateAndUpgradeTier(customerId, totalAmountEGP)
      console.log(`[LoyaltySubscriber] ✅ Tier evaluation completed for Customer #${customerId}.`);
    },
  )
}
