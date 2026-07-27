import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { CustomerEmailVerifiedEvent, CustomerRegisteredEvent } from '../customer-events'
import { LoyaltyService } from '../../loyalty/service'
import { LoyaltyRepository } from '../../loyalty/repository'

/**
 * Customer Event Subscriber
 * Listens to Customer Domain events and executes decoupled side effects like awarding welcome points.
 */
export function registerCustomerSubscribers(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const loyaltyRepository = new LoyaltyRepository(payload)
  const loyaltyService = new LoyaltyService(loyaltyRepository)

  // 1. Customer Registered -> Grant welcome bonus points ledger entry (Decoupled)
  eventBus.subscribe<CustomerRegisteredEvent>(
    'CUSTOMER_REGISTERED',
    'CustomerSubscriber.grantWelcomeBonus',
    async (event) => {
      try {
        console.log(
          `[CustomerSubscriber] Customer #${event.customerId} registered. Granting welcome bonus...`,
        )
        await loyaltyService.grantWelcomeBonus(event.customerId)
        console.log(
          `[CustomerSubscriber] Welcome bonus successfully granted for customer #${event.customerId}.`,
        )
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(
          `[CustomerSubscriber] Error granting welcome bonus for customer #${event.customerId}:`,
          msg,
        )
      }
    },
  )

  // 2. Customer Email Verified -> Logging only (Points are already granted at registration)
  eventBus.subscribe<CustomerEmailVerifiedEvent>(
    'CUSTOMER_EMAIL_VERIFIED',
    'CustomerSubscriber.logEmailVerified',
    async (event) => {
      console.log(
        `[CustomerSubscriber] Customer #${event.customerId} email verified. No duplicate bonus points granted.`,
      )
    },
  )
}
