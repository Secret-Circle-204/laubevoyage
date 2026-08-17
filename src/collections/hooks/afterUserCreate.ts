import type { CollectionAfterChangeHook } from 'payload'
import { getDomainServices } from '@/domains'
import type { RequestContext } from '@/types'

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
    // Delegate to the domain service inside the same transaction boundary.
    const services = await getDomainServices()
    const transactionId = req?.transactionID ? await req.transactionID : undefined
    const context: RequestContext | undefined = transactionId
      ? { transactionId }
      : undefined

    console.log(`[afterUserCreate Hook] Traced external customer creation for ID #${doc.id}. Transactional Context:`, !!transactionId)

    try {
      await services.customer.onCustomerCreated(Number(doc.id), context)
      console.log(`[afterUserCreate Hook] Successfully triggered and completed onCustomerCreated for customer #${doc.id}`)
    } catch (err) {
      console.error(`[afterUserCreate Hook] Fatal error processing onCustomerCreated for customer #${doc.id}. Rethrowing to trigger transaction rollback. Error details:`, err)
      throw err
    }
  }

  return doc
}
