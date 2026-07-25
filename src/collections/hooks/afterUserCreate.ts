import type { CollectionAfterChangeHook } from 'payload'
import { getDomainServices } from '@/domains'

/**
 * Hook: Dumb bridge that forwards customer creations to the Customer Domain.
 * Avoids duplicate events when registration is triggered by the Domain Service itself.
 */
export const afterUserCreate: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation === 'create' && doc.email) {
    // If the creation was initiated by the domain, it will publish the event itself.
    if (req?.context?.eventSource === 'domain') {
      return doc
    }

    // Otherwise, this is an external/exceptional creation (e.g. Admin Panel, Seed, CLI).
    // Delegate to the domain service asynchronously in the background.
    const services = await getDomainServices()
    void services.customer.onCustomerCreated(Number(doc.id))
      .catch((err) => {
        console.error('[afterUserCreate Fallback Hook] Error publishing customer registration event:', err)
      })
  }

  return doc
}
