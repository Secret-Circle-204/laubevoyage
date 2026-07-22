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
    workflowEngine = new DashboardWorkflowEngine(mockPayload)
  })

  it('should execute portal overview workflow and return CQRS projection', async () => {
    const projection = await workflowEngine.executePortalOverviewWorkflow(1)

    expect(projection.customerId).toBe(1)
    expect(projection.customer.email).toBe('ahmed@laube.com')
    expect(projection.metrics.cacheHit).toBe(false) // First run is fallback aggregation
  })
})
