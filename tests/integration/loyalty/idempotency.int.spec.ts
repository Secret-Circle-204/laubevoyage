import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoyaltyWorkflowEngine } from '@/domains/loyalty/workflow'

describe('Loyalty Domain: Financial Ledger Idempotency Integration Tests', () => {
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

  it('should reject duplicate ledger entry creation for identical (referenceType, referenceId, type)', async () => {
    const mockCustomerDoc = {
      id: 5,
      loyalty: { points: 5000, tier: 'explorer', totalSpent: 5000 },
    }

    const mockExistingLedgerDoc = {
      id: 'ledg_101',
      user: 5,
      type: 'earn',
      amount: 5000,
      balance: 5000,
      referenceType: 'booking',
      referenceId: '1',
    }

    mockPayload.findByID.mockResolvedValue(mockCustomerDoc)
    mockPayload.find.mockResolvedValue({ docs: [mockExistingLedgerDoc] })

    await expect(workflowEngine.executeEarnWorkflow(5, 5000, 1, 'LBV-260723-00042')).rejects.toThrowError(
      '[LoyaltyRepository] Financial Idempotency Guard',
    )
    expect(mockPayload.create).not.toHaveBeenCalled()
  })
})
