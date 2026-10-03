import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { TierUpgradedEvent, LoyaltyEarnedEvent } from '../loyalty-events'
import { CustomerRepository } from '../../customer/repository'
import { NotificationService } from '../../notification/service'
import { PayloadInboxRepository } from '../repositories/payload-inbox-repository'
import type { CustomerService } from '../../customer/service'

/**
 * Loyalty Notification Subscriber
 * Listens to TierUpgradedEvent and LoyaltyEarnedEvent to enqueue notification jobs idempotently.
 * Atomic Inbox Guard protected for Exactly-Once processing & Fail-Fast recipient validation.
 */
export function registerLoyaltyNotificationSubscriber(
  payload: Payload,
  customerService: CustomerService,
  notificationService: NotificationService,
): void {
  const eventBus = EventBus.getInstance()
  const inboxRepo = new PayloadInboxRepository(payload)
  const customerRepository = new CustomerRepository(payload)

  // 1. TIER_UPGRADED Event -> Enqueue tier upgrade notification
  eventBus.subscribe<TierUpgradedEvent>(
    'TIER_UPGRADED',
    'LoyaltyNotificationSubscriber.enqueueTierUpgradeNotification',
    async (event) => {
      const subscriberName = 'LoyaltyNotificationSubscriber.enqueueTierUpgradeNotification'
      if (!event.eventId) {
        throw new Error('[LoyaltyNotificationSubscriber] TierUpgradedEvent missing required eventId.')
      }

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        const customer = await customerRepository.findById(Number(event.customerId), req)
        if (!customer || !customer.email) {
          throw new Error(
            `[LoyaltyNotificationSubscriber] Customer #${event.customerId} not found or missing email for tier upgrade notification.`,
          )
        }

        await notificationService.enqueueNotification(
          {
            referenceType: 'LOYALTY_TIER',
            referenceId: `${event.customerId}_${event.newTier}`,
            recipient: customer.email,
            channel: 'email',
            category: 'loyalty',
            priority: 'normal',
            templateId: 'tier_upgraded',
            translationKey: 'loyalty.tier_upgraded',
            templateData: {
              customerId: event.customerId,
              newTier: event.newTier,
              bonusGranted: event.bonusGranted,
            },
          },
          req,
        )

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(
          `[LoyaltyNotificationSubscriber] TIER_UPGRADED transaction failed for event ${event.eventId}:`,
          err,
        )
        throw err
      }
    },
  )

  // 2. LOYALTY_EARNED Event -> Enqueue points earned notification
  eventBus.subscribe<LoyaltyEarnedEvent>(
    'LOYALTY_EARNED',
    'LoyaltyNotificationSubscriber.enqueueLoyaltyEarnedNotification',
    async (event) => {
      const subscriberName = 'LoyaltyNotificationSubscriber.enqueueLoyaltyEarnedNotification'
      if (!event.eventId) {
        throw new Error('[LoyaltyNotificationSubscriber] LoyaltyEarnedEvent missing required eventId.')
      }

      // Welcome bonus points are communicated in the consolidated Welcome Email
      if (event.source === 'welcome_bonus') {
        return
      }

      // Booking points are reflected in customer history and balance;
      // standalone email is suppressed to prevent sending duplicate notifications on booking confirmation.
      if (event.source === 'booking') {
        console.log(
          `[LoyaltyNotificationSubscriber] Suppressing separate loyalty_earned email for Customer #${event.customerId} (Booking #${event.bookingId}). Points safely credited to ledger and customer balance.`,
        )
        return
      }

      const transactionID = await payload.db.beginTransaction()
      const req = { transactionID } as any
      try {
        const acquired = await inboxRepo.tryAcquire(event.eventId, subscriberName, req)
        if (!acquired) {
          if (transactionID) await payload.db.rollbackTransaction(transactionID)
          return
        }

        const customer = await customerRepository.findById(Number(event.customerId), req)
        if (!customer || !customer.email) {
          throw new Error(
            `[LoyaltyNotificationSubscriber] Customer #${event.customerId} not found or missing email for loyalty points notification.`,
          )
        }

        await notificationService.enqueueNotification(
          {
            referenceType: 'LOYALTY_EARN',
            referenceId: event.eventId,
            recipient: customer.email,
            channel: 'email',
            category: 'loyalty',
            priority: 'normal',
            templateId: 'loyalty_earned',
            translationKey: 'loyalty.points_earned',
            templateData: {
              customerId: event.customerId,
              points: event.points,
              balance: event.balance,
              bookingId: event.bookingId,
            },
          },
          req,
        )

        if (transactionID) await payload.db.commitTransaction(transactionID)
      } catch (err: unknown) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        console.error(
          `[LoyaltyNotificationSubscriber] LOYALTY_EARNED transaction failed for event ${event.eventId}:`,
          err,
        )
        throw err
      }
    },
  )
}
