import type { Payload, PayloadRequest } from 'payload'
import { EventBus } from '../event-bus'
import type { CustomerEmailVerifiedEvent, CustomerRegisteredEvent } from '../customer-events'
import type { LoyaltyService } from '../../loyalty/service'
import type { CustomerService } from '../../customer/service'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'
import type { RequestContext } from '@/types'

/**
 * Customer Event Subscriber
 * Listens to Customer Domain events and executes decoupled side effects like awarding welcome points.
 */
export function registerCustomerSubscribers(
  payload: Payload,
  customerService: CustomerService,
  loyaltyService: LoyaltyService,
): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)

  // 1. Customer Registered -> Grant welcome bonus points ledger entry (Decoupled)
  eventBus.subscribe<CustomerRegisteredEvent>(
    'CUSTOMER_REGISTERED',
    'CustomerSubscriber.grantWelcomeBonus',
    async (event) => {
      const subscriberName = 'CustomerSubscriber.grantWelcomeBonus'
      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as unknown as PayloadRequest
      const context: RequestContext = { transactionId: transactionID }

      try {
        console.log(
          `[CustomerSubscriber] Customer #${event.customerId} registered. Acquiring inbox lock...`,
        )
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          console.log(
            `[CustomerSubscriber] Event ${event.eventId} already processed by ${subscriberName}. No-op.`,
          )
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        // 1. Grant welcome bonus ledger entry (decoupled Loyalty Domain write)
        const ledgerRecord = await loyaltyService.grantWelcomeBonus(event.customerId, undefined, context)

        // 2. Reconcile Customer Projection (decoupled Customer Domain write)
        await customerService.updateLoyaltyProfile(
          event.customerId,
          { points: ledgerRecord.resultingBalance },
          context,
        )

        if (transactionID) await payload.db.commitTransaction(transactionID)
        console.log(
          `[CustomerSubscriber] Welcome bonus successfully granted and projection updated for customer #${event.customerId}.`,
        )
      } catch (error: unknown) {
        if (transactionID) {
          await payload.db.rollbackTransaction(transactionID)
        }
        const msg = error instanceof Error ? error.message : String(error)
        console.error(
          `[CustomerSubscriber] Error granting welcome bonus for customer #${event.customerId}:`,
          msg,
        )
        throw error
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
