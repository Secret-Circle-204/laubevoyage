import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DashboardWorkflowEngine } from '@/domains/dashboard/workflow'

describe('Dashboard Domain: Performance Budget & CQRS Read Model Tests', () => {
  let mockPayload: any
  let workflowEngine: DashboardWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn().mockImplementation(({ id }) =>
        Promise.resolve({ id: 1, email: 'ahmed@laube.com', firstName: 'Ahmed', status: 'active' }),
      ),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn(),
    }
    const mockQueryBus: any = {
      customerQueries: { getById: vi.fn().mockResolvedValue({ email: 'ahmed@laube.com', fullName: 'Ahmed', status: 'active' }) },
      loyaltyQueries: {
        getProjection: vi.fn().mockResolvedValue({ tier: 'voyager', balance: 500, totalSpentEGP: 25000 }),
        getActiveProgramConfig: vi.fn().mockResolvedValue({
          baseEarnRate: 0.1,
          tiers: {
            voyager: { minSpentEGP: 50000 },
            elite: { minSpentEGP: 150000 },
          }
        })
      },
      bookingQueries: { getByCustomerId: vi.fn().mockResolvedValue([{ bookingNumber: '#LBV-101', status: 'confirmed' }]) },
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
