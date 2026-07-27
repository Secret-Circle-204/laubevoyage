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

  /**
   * Process post-authentication domain rules for an authenticated customer.
   */
  async onCustomerAuthenticated(customerId: number): Promise<CustomerAggregate> {
    const customer = await this.repository.findById(customerId)
    if (!customer) {
      throw new Error(`[AuthenticationService] Customer with ID ${customerId} not found.`)
    }

    if (customer.status === 'suspended' || customer.status === 'deleted') {
      throw new Error(`[AuthenticationService] Cannot proceed. Account status: ${customer.status}`)
    }

    // Evaluate locking policy dynamically
    if (customer.lockedUntil) {
      const lockTime = new Date(customer.lockedUntil).getTime()
      if (lockTime > Date.now()) {
        throw new Error(`[AuthenticationService] Account is temporarily locked. Please try again later.`)
      }
    }

    const updated: CustomerAggregate = {
      ...customer,
      lastLoginAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockedUntil: undefined, // Clear lock state
    }

    return this.repository.save(updated)
  }

  async authenticate(email: string): Promise<CustomerAggregate> {
    const customer = await this.repository.findByEmail(email)
    if (!customer) {
      throw new Error(`[AuthenticationService] Invalid credentials for ${email}`)
    }

    return this.onCustomerAuthenticated(customer.customerId)
  }
}
