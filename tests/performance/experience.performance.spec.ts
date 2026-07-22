import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExperienceWorkflowEngine } from '@/domains/experience/workflow'

describe('Experience Domain: Performance Budget & Observability Tests', () => {
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

  it('should enforce Pricing Pipeline execution duration < 50ms', async () => {
    const startTime = performance.now()

    await workflowEngine.executePricingWorkflow(2000, {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: 'USD',
      travelers: { adults: 2 },
      bookingDate: '2026-08-01',
    })

    const duration = performance.now() - startTime
    expect(duration).toBeLessThan(50) // Performance budget < 50ms
  })
})
