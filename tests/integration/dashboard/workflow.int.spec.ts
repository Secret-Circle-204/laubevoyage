import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DashboardWorkflowEngine } from '@/domains/dashboard/workflow'

describe('Dashboard Domain: Workflow Integration Tests', () => {
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

  it('should execute portal overview workflow and return CQRS projection', async () => {
    const projection = await workflowEngine.executePortalOverviewWorkflow(1)

    expect(projection.customerId).toBe(1)
    expect(projection.customer.email).toBe('ahmed@laube.com')
    expect(projection.metrics.cacheHit).toBe(false) // First run is fallback aggregation
  })
})
