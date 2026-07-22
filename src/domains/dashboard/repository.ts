import type { Payload, PayloadRequest } from 'payload'
import type { CustomerPortalProjection } from './types'

/**
 * Dashboard Projection Repository
 * Sole data store for pre-compiled CQRS CustomerPortalProjection Read Models.
 */
export class DashboardProjectionRepository {
  private payload: Payload
  private mockCache: Map<number, CustomerPortalProjection> = new Map()

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findByCustomerId(customerId: number, req?: PayloadRequest): Promise<CustomerPortalProjection | null> {
    const cached = this.mockCache.get(customerId)
    if (cached) return cached

    return null
  }

  async saveProjection(projection: CustomerPortalProjection, req?: PayloadRequest): Promise<CustomerPortalProjection> {
    this.mockCache.set(projection.customerId, projection)
    return projection
  }
}
