import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExperienceWorkflowEngine } from '@/domains/experience/workflow'

describe('Experience Domain: ExperienceWorkflowEngine Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: ExperienceWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    workflowEngine = new ExperienceWorkflowEngine(mockPayload)
  })

  it('should execute pricing workflow and generate versioned snapshot with audit trace', async () => {
    const snapshot = await workflowEngine.executePricingWorkflow(2000, {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: 'USD',
      travelers: { adults: 2 },
      bookingDate: '2026-08-01',
    })

    expect(snapshot.snapshotId).toContain('snap_')
    expect(snapshot.displayCurrency).toBe('USD')
    expect(snapshot.auditTrace.length).toBeGreaterThan(0)
  })
})
