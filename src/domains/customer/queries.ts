import type { RequestContext } from '@/types'
import { CustomerRepository } from './repositories/customer-repository'
import type { CustomerAggregate } from './aggregate'

/**
 * Customer Queries Sub-Service
 * Read-only queries for customer identity and profile.
 */
export class CustomerQueries {
  private repository: CustomerRepository

  constructor(repository: CustomerRepository) {
    this.repository = repository
  }

  async getById(customerId: number, context?: RequestContext): Promise<CustomerAggregate> {
    return this.repository.findById(customerId, context)
  }

  async getByEmail(email: string, context?: RequestContext): Promise<CustomerAggregate | null> {
    return this.repository.findByEmail(email, context)
  }
}
