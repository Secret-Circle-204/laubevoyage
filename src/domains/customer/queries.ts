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

  async getById(customerId: number): Promise<CustomerAggregate> {
    return this.repository.findById(customerId)
  }

  async getByEmail(email: string): Promise<CustomerAggregate | null> {
    return this.repository.findByEmail(email)
  }
}
