import { describe, it, expect, vi } from 'vitest'
import { DashboardOverviewAggregator } from '@/domains/dashboard/overview-aggregator'

describe('Dashboard Domain: Overview Aggregator Unit Tests', () => {
  it('should assemble CustomerPortalProjection DTO using parallel non-blocking reads', async () => {
    const mockQueryBus: any = {
      customerQueries: { getById: vi.fn().mockResolvedValue({ email: 'ahmed@laube.com', fullName: 'Ahmed', status: 'active' }) },
      loyaltyQueries: { getProjection: vi.fn().mockResolvedValue({ tier: 'voyager', balance: 500, totalSpent: 25000 }) },
      bookingQueries: { getByCustomerId: vi.fn().mockResolvedValue([{ bookingNumber: '#LBV-101', status: 'confirmed' }]) },
    }

    const aggregator = new DashboardOverviewAggregator(mockQueryBus)
    const projection = await aggregator.aggregatePortalOverview(1)

    expect(projection.customer.email).toBe('ahmed@laube.com')
    expect(projection.loyalty.tier).toBe('voyager')
    expect(projection.loyalty.pointsBalance).toBe(500)
    expect(projection.trips.upcomingCount).toBe(1)
  })
})
