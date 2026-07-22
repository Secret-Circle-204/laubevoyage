import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { TierUpgradedEvent } from '../loyalty-events'
import { NotificationService } from '../../notification/service'

/**
 * Loyalty Notification Subscriber
 * Listens to TierUpgradedEvent to enqueue notification jobs.
 */
export function registerLoyaltyNotificationSubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const notificationService = new NotificationService(payload)

  eventBus.subscribe<TierUpgradedEvent>('TIER_UPGRADED', async (event) => {
    try {
      await notificationService.enqueueNotification({
        referenceType: 'LOYALTY_TIER',
        referenceId: `${event.customerId}_${event.newTier}`,
        recipient: `customer_${event.customerId}@example.com`,
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
      console.error(`[LoyaltyNotificationSubscriber] Error enqueuing tier upgrade notification:`, err.message)
    }
  })
}
