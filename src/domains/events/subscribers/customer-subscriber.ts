import type { Payload, PayloadRequest } from 'payload'
import { EventBus } from '../event-bus'
import type { CustomerEmailVerifiedEvent, CustomerRegisteredEvent } from '../customer-events'
import type { LoyaltyService } from '../../loyalty/service'
import type { CustomerService } from '../../customer/service'
import type { NotificationService } from '../../notification/service'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'
import type { RequestContext } from '@/types'

/**
 * Customer Event Subscriber
 * Listens to Customer Domain events and executes decoupled side effects like awarding welcome points
 * and enqueuing the consolidated post-verification Welcome + Loyalty Points communication.
 */
export function registerCustomerSubscribers(
  payload: Payload,
  customerService: CustomerService,
  loyaltyService: LoyaltyService,
  notificationService?: NotificationService,
): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)

  // 1. Customer Registered -> Log only
  eventBus.subscribe<CustomerRegisteredEvent>(
    'CUSTOMER_REGISTERED',
    'CustomerSubscriber.logRegistration',
    async (event) => {
      console.log(
        `[CustomerSubscriber] Customer #${event.customerId} registered with status "${event.status}". Verification pending.`,
      )
    },
  )

  // 2. Customer Email Verified -> Grant welcome bonus points ledger entry & enqueue consolidated Welcome Email (Atomic Transaction B)
  eventBus.subscribe<CustomerEmailVerifiedEvent>(
    'CUSTOMER_EMAIL_VERIFIED',
    'CustomerSubscriber.grantWelcomeBonus',
    async (event) => {
      const subscriberName = 'CustomerSubscriber.grantWelcomeBonus'
      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as unknown as PayloadRequest
      const context: RequestContext = { transactionId: transactionID }

      try {
        console.log(
          `[CustomerSubscriber] Customer #${event.customerId} email verified. Acquiring inbox lock...`,
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

        // 3. Enqueue Email #2: Welcome + Dynamic Loyalty Points Confirmation (Atomic with bonus)
        if (notificationService) {
          await notificationService.enqueueNotification(
            {
              referenceType: 'WELCOME',
              referenceId: String(event.customerId),
              customerId: event.customerId,
              recipient: event.email,
              channel: 'email',
              category: 'loyalty',
              priority: 'normal',
              templateId: 'welcome_email',
              translationKey: 'customer.welcome',
              templateData: {
                name: event.fullName,
                bonusPoints: ledgerRecord.points,
                balance: ledgerRecord.resultingBalance,
              },
            },
            context,
          )
        }

        if (transactionID) await payload.db.commitTransaction(transactionID)
        console.log(
          `[CustomerSubscriber] Welcome bonus successfully granted, projection updated, and welcome notification enqueued for customer #${event.customerId}.`,
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
}
