import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
import { LoyaltyService } from '../../loyalty/service'
import { CustomerService } from '../../customer/service'
import { CustomerRepository } from '../../customer/repository'
import { LoyaltyRepository } from '../../loyalty/repository'
import type { Payload } from 'payload'

/**
 * Customer Loyalty Subscriber
 * Listens to BookingConfirmedEvent to award points and evaluate tier progression via LoyaltyService.
 */
export function registerLoyaltySubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const loyaltyRepository = new LoyaltyRepository(payload)
  const customerRepository = new CustomerRepository(payload)
  const loyaltyService = new LoyaltyService(loyaltyRepository)
  const customerService = new CustomerService(customerRepository)

  eventBus.subscribe<BookingConfirmedEvent>('BOOKING_CONFIRMED', async (event) => {
    const booking = event.booking
    const customerId = booking.customerId
    const totalAmountEGP = booking.pricingSnapshot.totalAmountEGP

    // 1. Fetch customer profile
    const customer = await customerService.getProfile(customerId)
    if (!customer) return

    // 2. Calculate and grant earned loyalty points & evaluate tier progression strictly via LoyaltyService
    const pointsEarned = await loyaltyService.calculateEarnedPoints(totalAmountEGP)

    if (pointsEarned > 0) {
      await loyaltyService.earnPointsForBooking(
        customerId,
        booking.id,
        totalAmountEGP,
        booking.bookingNumber,
      )
    }

    // 3. Evaluate tier upgrade via LoyaltyService (Single Source of Truth)
    await loyaltyService.evaluateAndUpgradeTier(customerId, totalAmountEGP)
  })
}
