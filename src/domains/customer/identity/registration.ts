import type { Payload } from 'payload'
import { CustomerRepository } from '../repositories/customer-repository'
import type { CustomerAggregate } from '../aggregate'

/**
 * Registration Service
 * Handles customer account creation and duplicate checks.
 */
export class RegistrationService {
  private repository: CustomerRepository
  private payload: Payload

  constructor(payload: Payload, repository: CustomerRepository) {
    this.payload = payload
    this.repository = repository
  }

  async registerCustomer(email: string, firstName: string, lastName: string): Promise<CustomerAggregate> {
    const existing = await this.repository.findByEmail(email)
    if (existing) {
      throw new Error(`[RegistrationService] Customer with email ${email} already exists.`)
    }

    const doc = await this.payload.create({
      collection: 'customers',
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        status: 'pending_verification',
      },
    })

    return this.repository.findById(Number(doc.id))
  }
}
