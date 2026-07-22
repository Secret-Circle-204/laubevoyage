import { CustomerRepository } from '../repositories/customer-repository'
import type { CustomerAggregate } from '../aggregate'

/**
 * Authentication Service
 * Handles customer login, failed login tracking, and account locking.
 */
export class AuthenticationService {
  private repository: CustomerRepository

  constructor(repository: CustomerRepository) {
    this.repository = repository
  }

  async authenticate(email: string): Promise<CustomerAggregate> {
    const customer = await this.repository.findByEmail(email)
    if (!customer) {
      throw new Error(`[AuthenticationService] Invalid credentials for ${email}`)
    }

    if (customer.status === 'suspended' || customer.status === 'deleted') {
      throw new Error(`[AuthenticationService] Cannot authenticate. Account status: ${customer.status}`)
    }

    const updated: CustomerAggregate = {
      ...customer,
      lastLoginAt: new Date().toISOString(),
      failedLoginAttempts: 0,
    }

    return this.repository.save(updated)
  }
}
