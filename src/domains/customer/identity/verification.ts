import { CustomerRepository } from '../repositories/customer-repository'
import type { CustomerAggregate } from '../aggregate'

/**
 * Verification Service
 * Delegates email verification to the database layer (Payload Auth Verify).
 */
export class VerificationService {
  private repository: CustomerRepository

  constructor(repository: CustomerRepository) {
    this.repository = repository
  }

  async verifyEmailToken(rawToken: string): Promise<number> {
    return this.repository.verifyEmailByToken(rawToken)
  }
}
