import type { CollectionBeforeDeleteHook } from 'payload'
import { getDomainServices } from '@/domains/factory'
import { CustomerDeletionNotAllowedException } from '@/domains/customer/types'
import { APIError } from 'payload'

export const beforeCustomerDelete: CollectionBeforeDeleteHook = async ({ req, id }) => {
  if (!id) return
  const customerId = Number(id)

  req.payload.logger.info(`[beforeCustomerDelete] Executing domain cascading cleanup for customer ID ${customerId}`)

  try {
    const { customer: customerService } = await getDomainServices()
    await customerService.ensureDeletionAllowed(customerId, req)
  } catch (err: unknown) {
    if (err instanceof CustomerDeletionNotAllowedException) {
      req.payload.logger.warn(`[beforeCustomerDelete] Customer deletion blocked by business policy. Reason: ${err.message} (Customer ID: ${customerId})`)
      throw new APIError(err.message, 400)
    }
    throw err
  }
}
