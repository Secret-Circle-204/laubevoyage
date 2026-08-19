import { EventBus } from '../event-bus'
import type { TierUpgradedEvent, LoyaltyEarnedEvent } from '../loyalty-events'
import type { CustomerService } from '../../customer/service'
import type { NotificationService } from '../../notification/service'

/**
 * Loyalty Notification Subscriber
 * Listens to TierUpgradedEvent and LoyaltyEarnedEvent to enqueue notification jobs.
 */
export function registerLoyaltyNotificationSubscriber(
  customerService: CustomerService,
  notificationService: NotificationService,
): void {
  const eventBus = EventBus.getInstance()

  // 1. TIER_UPGRADED Event
  eventBus.subscribe<TierUpgradedEvent>(
    'TIER_UPGRADED',
    'LoyaltyNotificationSubscriber.enqueueTierUpgradeNotification',
    async (event) => {
      try {
        const customer = await customerService.getById(event.customerId)
        if (!customer) {
          throw new Error(`Customer with ID ${event.customerId} not found.`)
        }
        if (!customer.email) return

        await notificationService.enqueueNotification({
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
        })
      } catch (err: any) {
        console.error(
          `[LoyaltyNotificationSubscriber] Error enqueuing tier upgrade notification:`,
          err.message,
        )
      }
    },
  )

  // 2. LOYALTY_EARNED Event
  eventBus.subscribe<LoyaltyEarnedEvent>(
    'LOYALTY_EARNED',
    'LoyaltyNotificationSubscriber.enqueueLoyaltyEarnedNotification',
    async (event) => {
      try {
        const customer = await customerService.getById(event.customerId)
        if (!customer || !customer.email) return

        await notificationService.enqueueNotification({
          referenceType: 'LOYALTY_EARN',
          referenceId: String(event.eventId || `${event.customerId}_${Date.now()}`),
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
        })
      } catch (err: any) {
        console.error(
          `[LoyaltyNotificationSubscriber] Error enqueuing points earned notification:`,
          err.message,
        )
      }
    },
  )
}
