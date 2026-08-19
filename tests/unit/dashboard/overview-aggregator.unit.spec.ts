import { describe, it, expect, vi } from 'vitest'
import { DashboardOverviewAggregator } from '@/domains/dashboard/overview-aggregator'

describe('Dashboard Domain: Overview Aggregator Unit Tests', () => {
  it('should assemble CustomerPortalProjection DTO using parallel non-blocking reads', async () => {
    const mockQueryBus: any = {
      customerQueries: {
        getById: vi.fn().mockResolvedValue({ email: 'ahmed@laube.com', fullName: 'Ahmed', status: 'active' }),
        getActiveSessions: vi.fn().mockResolvedValue([]),
      },
      loyaltyQueries: {
        getProjection: vi.fn().mockResolvedValue({ tier: 'voyager', balance: 500, totalSpentEGP: 25000 }),
        getBalance: vi.fn().mockResolvedValue(500),
        getActiveProgramConfig: vi.fn().mockResolvedValue({
          baseEarnRate: 0.1,
          tiers: [
            { tier: 'explorer', labelEn: 'Explorer', labelAr: 'المكتشف', minSpentEGP: 0 },
            { tier: 'voyager', labelEn: 'Voyager', labelAr: 'المسافر', minSpentEGP: 50000 },
            { tier: 'elite', labelEn: 'Elite', labelAr: 'النخبة', minSpentEGP: 150000 },
          ]
        })
      },
      bookingQueries: {
        getCustomerTripSummary: vi.fn().mockResolvedValue({
          activeBookingsCount: 1,
          upcomingCount: 1,
          latestBookingNumber: '#LBV-101',
          nextDepartureDate: '2026-09-15',
        }),
      },
    }

    const aggregator = new DashboardOverviewAggregator(mockQueryBus)
    const projection = await aggregator.aggregatePortalOverview(1)

    expect(projection.customer.email).toBe('ahmed@laube.com')
    expect(projection.loyalty.tier).toBe('voyager')
    expect(projection.loyalty.pointsBalance).toBe(500)
    expect(projection.trips.upcomingCount).toBe(1)
    expect(projection.trips.activeBookingsCount).toBe(1)
    expect(projection.trips.latestBookingNumber).toBe('#LBV-101')
  })
})
