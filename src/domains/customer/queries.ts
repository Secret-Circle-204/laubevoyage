import type { RequestContext } from '@/types'
import { CustomerRepository } from './repositories/customer-repository'
import { DeviceSessionRepository } from './repositories/session-repository'
import type { CustomerAggregate } from './aggregate'
import type { DeviceSessionEntity } from './types'

/**
 * Customer Queries Sub-Service
 * Read-only queries for customer identity, profile, and session telemetry.
 */
export class CustomerQueries {
  private repository: CustomerRepository
  private sessionRepository: DeviceSessionRepository

  constructor(repository: CustomerRepository, sessionRepository: DeviceSessionRepository) {
    this.repository = repository
    this.sessionRepository = sessionRepository
  }

  async getById(customerId: number, context?: RequestContext): Promise<CustomerAggregate> {
    return this.repository.findById(customerId, context)
  }

  async getByEmail(email: string, context?: RequestContext): Promise<CustomerAggregate | null> {
    return this.repository.findByEmail(email, context)
  }

  async getActiveSessions(customerId: number): Promise<DeviceSessionEntity[]> {
    return this.sessionRepository.findActiveByCustomerId(customerId)
  }
}
