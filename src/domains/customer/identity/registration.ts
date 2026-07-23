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

  async registerCustomer(email: string, firstName: string, lastName: string): Promise<CustomerAggregate> {
    const existing = await this.repository.findByEmail(email)
    if (existing) {
      throw new Error(`[RegistrationService] Customer with email ${email} already exists.`)
    }

    const doc = await this.repository.create({
      email: email.toLowerCase(),
      firstName,
      lastName,
      status: 'pending_verification',
    })

    return this.repository.findById(Number(doc.id))
  }
}
