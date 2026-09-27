import type { RequestContext } from '@/types'
import { CustomerRepository } from '../repositories/customer-repository'
import type { CustomerAggregate } from '../aggregate'
import type { CustomerPreferencesInput } from '../types'
import {
  AccountPendingVerificationException,
  CustomerAlreadyExistsException,
} from '@/domains/shared/exceptions/domain-exception'

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
    phone: string,
    password?: string,
    preferences?: CustomerPreferencesInput,
    options?: { eventSource?: 'domain' | 'external' },
    context?: RequestContext,
  ): Promise<CustomerAggregate> {
    const trimmedEmail = email.toLowerCase().trim()
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedPhone) {
      throw new Error('[RegistrationService] Phone number is required for customer registration.')
    }

    const existing = await this.repository.findByEmail(trimmedEmail, context)
    if (existing) {
      if (existing.isEmailVerified || existing.status === 'active') {
        throw new CustomerAlreadyExistsException(trimmedEmail)
      }

      if (existing.status === 'pending_verification') {
        const { expiresAt } = await this.repository.getVerificationDispatchData(existing.customerId)
        const isExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false

        if (!isExpired) {
          throw new AccountPendingVerificationException(
            `An account with email ${trimmedEmail} is awaiting verification. Please check your inbox or request a new verification link.`,
          )
        }

        // Stale unverified identity has expired (verificationExpiresAt <= now).
        // Under the domain retention contract, purge this dead record within the transaction
        // so the customer can register cleanly without waiting for the background retention cron.
        console.log(`[RegistrationService] Purging expired unverified customer #${existing.customerId} (${trimmedEmail}) to allow clean re-registration.`)
        await this.repository.deleteCustomerById(existing.customerId, context)
      } else {
        throw new CustomerAlreadyExistsException(trimmedEmail)
      }
    }

    const data: Record<string, unknown> = {
      email: trimmedEmail,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      phone: trimmedPhone,
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
