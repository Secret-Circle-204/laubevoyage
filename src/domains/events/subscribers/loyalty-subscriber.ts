import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
import { LoyaltyService } from '../../loyalty/service'
import { CustomerService } from '../../customer/service'
import { CustomerRepository } from '../../customer/repository'
import type { Payload } from 'payload'

/**
 * Customer Loyalty Subscriber
 * Listens to BookingConfirmedEvent to award points and evaluate tier progression via CustomerService.
 */
export function registerLoyaltySubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const loyaltyService = new LoyaltyService(payload)
  const customerService = new CustomerService(payload)
  const customerRepository = new CustomerRepository(payload)

  eventBus.subscribe<BookingConfirmedEvent>('BOOKING_CONFIRMED', async (event) => {
    const booking = event.booking
    const customerId = booking.customerId
    const totalAmountEGP = booking.pricingSnapshot.totalAmountEGP

    // 1. Fetch customer profile
    const customer = await customerService.getProfile(customerId)
    if (!customer) return

    // 2. Calculate and grant earned loyalty points
    const pointsEarned = loyaltyService.calculateEarnedPoints(totalAmountEGP)

    if (pointsEarned > 0) {
      await loyaltyService.earn(
        customerId,
        totalAmountEGP,
        booking.id,
        booking.bookingNumber,
      )
    }

    // 3. Update customer total spent via CustomerRepository
    const newTotalSpent = (customer.loyalty?.totalSpent || 0) + totalAmountEGP
    await customerRepository.update(customerId, {
      loyalty: {
        tier: (customer.loyalty?.tier || 'explorer') as 'explorer' | 'voyager' | 'elite',
        totalSpent: newTotalSpent,
      },
    })

    // 4. Evaluate tier upgrade
    await loyaltyService.evaluateTier(customerId)
  })
}
