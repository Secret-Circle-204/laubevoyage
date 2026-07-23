import type { Payload, PayloadRequest } from 'payload'
import type { CustomerPortalProjection } from './types'

/**
 * Dashboard Projection Repository
 * Data store for pre-compiled CQRS CustomerPortalProjection Read Models.
 */
export class DashboardProjectionRepository {
  private payload: Payload
  private projectionMap: Map<number, CustomerPortalProjection> = new Map()

  constructor(payload: Payload) {
    this.payload = payload
  }

  async findByCustomerId(customerId: number, req?: PayloadRequest): Promise<CustomerPortalProjection | null> {
    const cached = this.projectionMap.get(customerId)
    if (cached) return cached

    try {
      const res = await this.payload.find({
        collection: 'customers',
        where: { id: { equals: customerId } },
        limit: 1,
        req,
      })

      if (!res.docs.length) return null

      const customer: Record<string, any> = res.docs[0]
      const projection: CustomerPortalProjection = {
        projectionId: `proj_${customerId}`,
        customerId: Number(customer.id),
        customer: {
          customerId: Number(customer.id),
          email: customer.email || '',
          fullName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || '',
          isEmailVerified: !!customer.emailVerifiedAt,
          status: customer.status || 'active',
          preferredCurrency: customer.preferences?.preferredCurrency || 'EGP',
        },
        loyalty: {
          tier: customer.loyalty?.tier || 'explorer',
          pointsBalance: customer.loyalty?.points || 0,
          activeHoldsCount: 0,
          totalSpentEGP: customer.loyalty?.totalSpent || 0,
          tierProgressPercentage: 0,
        },
        trips: {
          upcomingCount: 0,
          activeBookingsCount: 0,
        },
        security: {
          activeDeviceCount: 1,
        },
        metrics: {
          cacheHit: true,
          aggregationDurationMs: 0,
          projectionVersion: '1.0',
          lastRefreshAt: new Date().toISOString(),
        },
        version: 1,
        updatedAt: new Date().toISOString(),
      }

      this.projectionMap.set(customerId, projection)
      return projection
    } catch {
      return null
    }
  }

  async saveProjection(projection: CustomerPortalProjection, req?: PayloadRequest): Promise<CustomerPortalProjection> {
    this.projectionMap.set(projection.customerId, projection)
    return projection
  }
}
