import type { CustomerRepository } from './repositories/customer-repository'
import type { GranularGDPRConsent } from './types'

/**
 * GDPR Consent Manager Sub-Service
 * Handles GDPR privacy consent tracking and account deletion workflows.
 */
export class GDPRConsentManager {
  private repository: CustomerRepository

  constructor(repository: CustomerRepository) {
    this.repository = repository
  }

  recordConsent(marketingConsent: boolean, dataProcessingConsent: boolean): GranularGDPRConsent {
    return {
      marketingConsent,
      dataProcessingConsent,
      privacyPolicyVersion: 'v2.1',
      termsVersion: 'v2.0',
      cookieVersion: 'v1.0',
      consentedAt: new Date().toISOString(),
    }
  }

  async requestAccountDeletion(customerId: number): Promise<void> {
    const customer = await this.repository.findById(customerId)
    await this.repository.updateStatus(customerId, 'pending_deletion')
  }
}
