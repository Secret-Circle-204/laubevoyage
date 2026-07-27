import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExperienceWorkflowEngine } from '@/domains/experience/workflow'
import { PricingPipelineEngine } from '@/domains/currency/pipeline'

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
    const mockRateProvider = {
      getExchangeRate: async (fromCurrency: string, toCurrency: string): Promise<number> => {
        if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1.0
        if (fromCurrency.toUpperCase() === 'EGP' && toCurrency.toUpperCase() === 'USD') return 0.02
        return 1.0
      }
    }
    const mockSettingsProvider = {
      getSettings: async () => ({
        vatRate: 0.14,
        vatEnabled: true,
        pricesIncludeVat: false
      })
    }
    const pricingPipeline = new PricingPipelineEngine(mockRateProvider, mockSettingsProvider)
    workflowEngine = new ExperienceWorkflowEngine(mockPayload, pricingPipeline)
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
    expect(snapshot.auditTrace?.length).toBeGreaterThan(0)
  })
})
