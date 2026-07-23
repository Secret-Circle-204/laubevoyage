import type { CollectionAfterChangeHook } from 'payload'
import { getDomainServices } from '@/domains'

/**
 * Hook: Grant welcome bonus after user registration
 */
export const afterUserCreate: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation === 'create' && doc.email) {
    const services = await getDomainServices()

    // Grant welcome bonus
    await services.loyalty.grantWelcomeBonus(Number(doc.id))

    // Send welcome email notification
    await services.notification.enqueueNotification({
      referenceType: 'WELCOME',
      referenceId: String(doc.id),
      recipient: doc.email,
      channel: 'email',
      category: 'marketing',
      priority: 'normal',
      templateId: 'welcome_email',
      translationKey: 'customer.welcome',
      templateData: { name: doc.firstName || '' },
    })
  }

  return doc
}
