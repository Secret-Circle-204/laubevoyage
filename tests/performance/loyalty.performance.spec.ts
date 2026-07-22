import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoyaltyWorkflowEngine } from '@/domains/loyalty/workflow'

describe('Loyalty Domain: Performance Budget & Observability Tests', () => {
  let mockPayload: any
  let workflowEngine: LoyaltyWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn().mockResolvedValue({ id: 5, loyalty: { points: 5000, tier: 'explorer', totalSpent: 5000 } }),
      find: vi.fn().mockResolvedValue({ docs: [{ balance: 5000 }] }),
      update: vi.fn(),
    }
    workflowEngine = new LoyaltyWorkflowEngine(mockPayload)
  })

  it('should enforce loyalty balance query execution duration < 200ms', async () => {
    const startTime = performance.now()

    const balance = await workflowEngine.queries.getBalance(5)

    const duration = performance.now() - startTime
    expect(duration).toBeLessThan(200) // Performance budget < 200ms
    expect(balance).toBe(5000)
  })
})
