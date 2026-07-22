import { describe, it, expect } from 'vitest'
import { DashboardProjectionRepository } from '@/domains/dashboard/repository'
import type { CustomerPortalProjection } from '@/domains/dashboard/types'

describe('Dashboard Domain: CQRS Projection Repository Unit Tests', () => {
  it('should save and retrieve CQRS CustomerPortalProjection read models from repository cache', async () => {
    const repo = new DashboardProjectionRepository({} as any)
    const mockProjection: CustomerPortalProjection = {
      projectionId: 'proj_1_101',
      customerId: 1,
      customer: { customerId: 1, email: 'ahmed@laube.com', fullName: 'Ahmed', isEmailVerified: true, status: 'active', preferredCurrency: 'EGP' },
      loyalty: { tier: 'explorer', pointsBalance: 100, activeHoldsCount: 0, totalSpentEGP: 5000, tierProgressPercentage: 5 },
      trips: { upcomingCount: 1, activeBookingsCount: 1 },
      security: { activeDeviceCount: 1 },
      metrics: { cacheHit: true, aggregationDurationMs: 2, projectionVersion: 'v1.0.0', lastRefreshAt: '2026-07-22T00:00:00.000Z' },
      version: 1,
      updatedAt: '2026-07-22T00:00:00.000Z',
    }

    await repo.saveProjection(mockProjection)
    const fetched = await repo.findByCustomerId(1)

    expect(fetched).not.toBeNull()
    expect(fetched?.customer.email).toBe('ahmed@laube.com')
    expect(fetched?.loyalty.pointsBalance).toBe(100)
  })
})
