import type { CollectionAfterChangeHook } from 'payload'
import { getDomainServices } from '@/domains'

/**
 * Hook: Grant welcome bonus after user registration
 */
export const afterUserCreate: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation === 'create') {
    const services = getDomainServices(req.payload)

    // Grant welcome bonus
    await services.loyalty.grantWelcomeBonus(Number(doc.id))

    // Send welcome email
    await services.notification.sendWelcomeEmail(Number(doc.id))
  }

  return doc
}
