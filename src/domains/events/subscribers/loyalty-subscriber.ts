import { EventBus } from '../event-bus'
import type { BookingConfirmedEvent } from '../booking-events'
import { LoyaltyService } from '../../loyalty/service'
import { CustomerService } from '../../customer/service'
import { PointTransactionType } from '@/types'
import type { Payload } from 'payload'

/**
 * Customer Loyalty Subscriber
 * Listens to BookingConfirmedEvent to award points and evaluate tier progression via CustomerService.
 */
export function registerLoyaltySubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const loyaltyService = new LoyaltyService(payload)
  const customerService = new CustomerService(payload)

  eventBus.subscribe<BookingConfirmedEvent>('BOOKING_CONFIRMED', async (event) => {
    const booking = event.booking
    const customerId = booking.customerId
    const totalAmountEGP = booking.pricingSnapshot.totalAmountEGP

    // 1. Fetch customer profile
    const customer = await customerService.getProfile(customerId)
    if (!customer) return

    // 2. Calculate and grant earned loyalty points
    const tier = customer.loyalty?.tier || 'explorer'
    const pointsEarned = loyaltyService.calculateEarnedPoints(totalAmountEGP, tier)

    if (pointsEarned > 0) {
      await loyaltyService.earn(
        customerId,
        pointsEarned,
        PointTransactionType.EARNED,
        `Earned from booking ${booking.bookingNumber}`,
        booking.id,
      )
    }

    // 3. Update customer total spent
    const newTotalSpent = (customer.loyalty?.totalSpent || 0) + totalAmountEGP
    await payload.update({
      collection: 'customers',
      id: customerId,
      data: {
        loyalty: {
          ...customer.loyalty,
          totalSpent: newTotalSpent,
        },
      },
    })

    // 4. Evaluate tier upgrade
    await loyaltyService.evaluateTier(customerId)
  })
}
