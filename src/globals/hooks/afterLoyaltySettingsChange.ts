import type { GlobalAfterChangeHook } from 'payload'
import { loyaltyProgramRegistry } from '@/domains/loyalty/program-registry'

/**
 * Event-Driven Cache Invalidation Hook for LoyaltySettings global.
 * Triggered automatically by Payload CMS whenever an admin edits or updates loyalty program settings.
 */
export const afterLoyaltySettingsChange: GlobalAfterChangeHook = async ({ doc }) => {
  console.log('[afterLoyaltySettingsChange Hook] Invalidating LoyaltyProgramRegistry cache due to LoyaltySettings update')
  loyaltyProgramRegistry.invalidate()
  return doc
}
