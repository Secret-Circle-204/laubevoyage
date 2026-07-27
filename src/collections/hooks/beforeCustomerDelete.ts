import type { CollectionBeforeDeleteHook } from 'payload'
import { CustomerRepository } from '@/domains/customer/repositories/customer-repository'

export const beforeCustomerDelete: CollectionBeforeDeleteHook = async ({ req, id }) => {
  if (!id) return
  const customerId = Number(id)

  req.payload.logger.info(`[beforeCustomerDelete] Executing domain cascading cleanup for customer ID ${customerId}`)

  const customerRepo = new CustomerRepository(req.payload)
  await customerRepo.deleteAssociatedData(customerId, req)
}
