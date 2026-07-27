import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { TierUpgradedEvent } from '../loyalty-events'
import { NotificationService } from '../../notification/service'
import { NotificationRepository } from '../../notification/repository'
import { CustomerRepository } from '../../customer/repository'

/**
 * Loyalty Notification Subscriber
 * Listens to TierUpgradedEvent to enqueue notification jobs.
 */
export function registerLoyaltyNotificationSubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const notificationRepository = new NotificationRepository(payload)
  const customerRepository = new CustomerRepository(payload)
  const notificationService = new NotificationService(notificationRepository)

  eventBus.subscribe<TierUpgradedEvent>(
    'TIER_UPGRADED',
    'LoyaltyNotificationSubscriber.enqueueTierUpgradeNotification',
    async (event) => {
      try {
        const customer = await customerRepository.findById(event.customerId).catch(() => null)
        if (!customer?.email) return

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
}
