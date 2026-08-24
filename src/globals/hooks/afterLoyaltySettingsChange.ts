import type { GlobalAfterChangeHook } from 'payload'
import { loyaltyProgramRegistry } from '@/domains/loyalty/program-registry'
import { EventBus } from '@/domains/events/event-bus'

/**
 * Event-Driven Cache Invalidation Hook for LoyaltySettings global.
 * Triggered automatically by Payload CMS whenever an admin edits or updates loyalty program settings.
 */
export const afterLoyaltySettingsChange: GlobalAfterChangeHook = async ({ doc }) => {
  console.log(
    `[afterLoyaltySettingsChange Hook] Triggered. PID: ${process.pid}, Uptime: ${process.uptime()}s`,
  )
  console.log(`[afterLoyaltySettingsChange Hook] Global payload doc saved:`, {
    baseEarnRate: doc?.baseEarnRate,
    redemptionPointsUnit: doc?.redemptionPointsUnit,
    redemptionValueEGP: doc?.redemptionValueEGP,
  })
  console.log(
    `[afterLoyaltySettingsChange Hook] Invalidating cache on registry ID: ${(loyaltyProgramRegistry as any).id}`,
  )
  loyaltyProgramRegistry.invalidate()

  // Publish LOYALTY_SETTINGS_UPDATED to EventBus to propagate invalidation to all subscribers
  const eventBus = EventBus.getInstance()
  await eventBus.publish({
    type: 'LOYALTY_SETTINGS_UPDATED',
    eventId: `evt_loyalty_set_${Date.now()}`,
    correlationId: `corr_loyalty_set_${Date.now()}`,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
  })

  return doc
}
