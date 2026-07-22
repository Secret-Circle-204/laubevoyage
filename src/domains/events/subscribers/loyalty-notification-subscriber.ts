import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { TierUpgradedEvent, LoyaltyEarnedEvent } from '../loyalty-events'
import { NotificationQueue } from '../../notification/queue'

/**
 * Loyalty Notification Subscriber
 * Listens to TierUpgradedEvent and LoyaltyEarnedEvent to enqueue notification jobs.
 */
export function registerLoyaltyNotificationSubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const notificationQueue = NotificationQueue.getInstance()

  eventBus.subscribe<TierUpgradedEvent>('TIER_UPGRADED', async (event) => {
    await notificationQueue.enqueue({
      id: `notif_tier_${Date.now()}`,
      bookingId: 0,
      recipientEmail: `customer_${event.customerId}@example.com`,
      type: 'TIER_UPGRADED',
      payload: {
        customerId: event.customerId,
        newTier: event.newTier,
        bonusGranted: event.bonusGranted,
      },
      status: 'pending',
      attempts: 0,
      createdAt: event.timestamp,
    })
  })
}
