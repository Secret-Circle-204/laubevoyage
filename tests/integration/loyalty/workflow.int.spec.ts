import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoyaltyWorkflowEngine } from '@/domains/loyalty/workflow'

describe('Loyalty Domain: LoyaltyWorkflowEngine Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: LoyaltyWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    workflowEngine = new LoyaltyWorkflowEngine(mockPayload)
  })

  it('should execute earn workflow, append ledger entry, and update customer projection', async () => {
    const mockCustomerDoc = {
      id: 5,
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
      loyalty: {
        points: 0,
        tier: 'explorer',
        totalSpent: 0,
      },
    }

    const mockLedgerDoc = {
      id: 'ledg_101',
      user: 5,
      type: 'earn',
      amount: 5000,
      balance: 5000,
      reason: 'Earned 5000 points',
      createdAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.findByID.mockResolvedValue(mockCustomerDoc)
    mockPayload.find.mockResolvedValue({ docs: [] })
    mockPayload.create.mockResolvedValue(mockLedgerDoc)
    mockPayload.update.mockResolvedValue(mockCustomerDoc)

    const record = await workflowEngine.executeEarnWorkflow(5, 5000, 1, 'LBV-260723-00042')

    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'point-ledger',
      }),
    )
    expect(record.points).toBe(5000)
    expect(record.resultingBalance).toBe(5000)
  })
})
