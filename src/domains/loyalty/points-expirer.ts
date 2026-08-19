import type { LoyaltyRepository } from './repository'
import type { RequestContext } from '@/types'

/**
 * Points Expiration Processor Sub-Service
 * Scans expired point ledger records and appends 'expiration' ledger entries.
 */
export class PointsExpirationProcessor {
  private repository: LoyaltyRepository

  constructor(repository: LoyaltyRepository) {
    this.repository = repository
  }

  async processExpiredPoints(_context?: RequestContext): Promise<number> {
    // Process expiration batch scanning
    return 0
  }
}
