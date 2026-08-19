import type { RequestContext } from '@/types'
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
    context?: RequestContext,
  ): Promise<CustomerAggregate> {
    const existing = await this.repository.findByEmail(email, context)
    if (existing) {
      throw new Error(`[RegistrationService] Customer with email ${email} already exists.`)
    }

    const data: Record<string, unknown> = {
      email: email.toLowerCase(),
      firstName,
      lastName,
      password,
      status: 'pending_verification',
      verificationExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    }

    if (preferences?.preferredLanguage || preferences?.preferredCurrency) {
      data.preferences = {
        preferredLanguage: preferences.preferredLanguage,
        preferredCurrency: preferences.preferredCurrency,
        preferredLocale: preferences.preferredLanguage === 'ar' ? 'ar-EG' : 'en-US',
      }
    }

    return this.repository.create(data, options, context)
  }
}
