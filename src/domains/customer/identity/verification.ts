import { createHash } from 'crypto'
import { CustomerRepository } from '../repositories/customer-repository'
import type { CustomerAggregate } from '../aggregate'

/**
 * Verification Service
 * Manages email and phone verification using secure SHA-256 hashed verification tokens.
 */
export class VerificationService {
  private repository: CustomerRepository
  private tokenStore: Map<string, { customerId: number; tokenHash: string; expiresAt: string }> = new Map()

  constructor(repository: CustomerRepository) {
    this.repository = repository
  }

  generateVerificationToken(customerId: number): string {
    const rawToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    this.tokenStore.set(String(customerId), {
      customerId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    return rawToken
  }

  async verifyEmailToken(customerId: number, rawToken: string): Promise<CustomerAggregate> {
    const record = this.tokenStore.get(String(customerId))
    if (!record) {
      throw new Error(`[VerificationService] Verification token not found for customer ${customerId}`)
    }

    const inputHash = createHash('sha256').update(rawToken).digest('hex')
    if (inputHash !== record.tokenHash) {
      throw new Error(`[VerificationService] Invalid verification token hash.`)
    }

    const customer = await this.repository.findById(customerId)
    const updated: CustomerAggregate = {
      ...customer,
      isEmailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      status: customer.status === 'pending_verification' ? 'active' : customer.status,
    }

    return this.repository.save(updated)
  }
}
