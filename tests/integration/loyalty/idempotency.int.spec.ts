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
      findGlobal: vi.fn().mockResolvedValue({
        programCode: 'welcome',
        baseEarnRate: 0.1,
        redemptionPointsUnit: 100,
        redemptionValueEGP: 10,
        minRedemptionPoints: 100,
        maxRedemptionPercent: 10,
        welcomeBonus: 1000,
        expirationMonths: 12,
        isActive: true,
        tiers: [
          {
            tier: 'explorer',
            label: 'Explorer',
            minSpentEGP: 0,
            earnMultiplier: 1,
            upgradeBonus: 0,
          },
          {
            tier: 'voyager',
            label: 'Voyager',
            minSpentEGP: 50000,
            earnMultiplier: 1.5,
            upgradeBonus: 1000,
          },
          {
            tier: 'elite',
            label: 'Elite',
            minSpentEGP: 150000,
            earnMultiplier: 2.0,
            upgradeBonus: 5000,
          }
        ]
      }),
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

    await expect(workflowEngine.earnPointsForBooking(5, 1, 5000, 'LBV-260723-00042')).rejects.toThrowError(
      '[LoyaltyRepository] Financial Idempotency Guard',
    )
    expect(mockPayload.create).not.toHaveBeenCalled()
  })
})
