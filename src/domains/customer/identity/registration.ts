import { CustomerRepository } from '../repositories/customer-repository'
import type { CustomerAggregate } from '../aggregate'
import type { CustomerPreferencesInput } from '../types'

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
    preferences?: CustomerPreferencesInput,
    options?: { eventSource?: 'domain' | 'external' },
  ): Promise<CustomerAggregate> {
    const existing = await this.repository.findByEmail(email)
    if (existing) {
      throw new Error(`[RegistrationService] Customer with email ${email} already exists.`)
    }

    const data: Record<string, any> = {
      email: email.toLowerCase(),
      firstName,
      lastName,
      password,
      status: 'pending_verification',
    }

    if (preferences?.preferredLanguage || preferences?.preferredCurrency) {
      data.preferences = {
        preferredLanguage: preferences.preferredLanguage,
        preferredCurrency: preferences.preferredCurrency,
        preferredLocale: preferences.preferredLanguage === 'ar' ? 'ar-EG' : 'en-US',
      }
    }

    return this.repository.create(data, options)
  }
}
