import { CustomerRepository } from '../repositories/customer-repository'
import type { CustomerAggregate } from '../aggregate'

/**
 * Registration Service
 * Handles customer account creation and duplicate checks via Constructor Dependency Injection.
 */
export class RegistrationService {
  private repository: CustomerRepository

  constructor(repository: CustomerRepository) {
    this.repository = repository
  }

  async registerCustomer(
    email: string,
    firstName: string,
    lastName: string,
    password?: string,
    options?: { eventSource?: 'domain' | 'external' },
  ): Promise<CustomerAggregate> {
    const existing = await this.repository.findByEmail(email)
    if (existing) {
      throw new Error(`[RegistrationService] Customer with email ${email} already exists.`)
    }

    return this.repository.create({
      email: email.toLowerCase(),
      firstName,
      lastName,
      password,
      status: 'pending_verification',
    }, options)
  }
}
