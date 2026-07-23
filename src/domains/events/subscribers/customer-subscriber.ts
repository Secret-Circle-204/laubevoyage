import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { CustomerEmailVerifiedEvent } from '../customer-events'
import { LoyaltyService } from '../../loyalty/service'

/**
 * Customer Event Subscriber
 * Listens to CUSTOMER_EMAIL_VERIFIED events and grants welcome loyalty points decoupled from Customer domain.
 */
export function registerCustomerSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const loyaltyService = new LoyaltyService(payload)

  eventBus.subscribe<CustomerEmailVerifiedEvent>('CUSTOMER_EMAIL_VERIFIED', async (event) => {
    try {
      console.log(`[CustomerSubscriber] Customer #${event.customerId} email verified. Granting welcome bonus...`)
      // Grant 50 welcome points for email verification
      await loyaltyService.grantWelcomeBonus(event.customerId)
    } catch (error: any) {

      console.error(`[CustomerSubscriber] Error granting welcome bonus for customer #${event.customerId}:`, error.message)
    }
  })
}
