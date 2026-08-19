import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DashboardWorkflowEngine } from '@/domains/dashboard/workflow'

describe('Dashboard Domain: Performance Budget & CQRS Read Model Tests', () => {
  let mockPayload: any
  let workflowEngine: DashboardWorkflowEngine

  beforeEach(() => {
    const savedProjections: any[] = []
    mockPayload = {
      create: vi.fn().mockImplementation(({ data }) => {
        const doc = { id: 'proj_1', customer: data.customer, projectionJson: data.projectionJson }
        savedProjections.push(doc)
        return Promise.resolve(doc)
      }),
      findByID: vi.fn().mockImplementation(({ id }) =>
        Promise.resolve({ id: 1, email: 'ahmed@laube.com', firstName: 'Ahmed', status: 'active' }),
      ),
      find: vi.fn().mockImplementation(({ collection, where }) => {
        if (collection === 'dashboard-projections') {
          const customerId = where?.customer?.equals
          const doc = savedProjections.find((p) => p.customer === customerId)
          return Promise.resolve({ docs: doc ? [doc] : [] })
        }
        return Promise.resolve({ docs: [] })
      }),
      update: vi.fn().mockImplementation(({ id, data }) => {
        const index = savedProjections.findIndex((p) => p.id === id)
        if (index !== -1) {
          savedProjections[index] = { ...savedProjections[index], ...data }
          return Promise.resolve(savedProjections[index])
        }
        return Promise.resolve({})
      }),
    }
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
    workflowEngine = new DashboardWorkflowEngine(mockPayload, mockQueryBus)
  })

  it('should enforce CQRS projection cache read duration < 5ms on warm cache', async () => {
    // Warm up projection cache
    await workflowEngine.executePortalOverviewWorkflow(1)

    const startTime = performance.now()
    const projection = await workflowEngine.executePortalOverviewWorkflow(1)
    const duration = performance.now() - startTime

    expect(projection.metrics.cacheHit).toBe(true)
    expect(duration).toBeLessThan(5) // CQRS cache read budget < 5ms
  })
})
