import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExperienceWorkflowEngine } from '@/domains/experience/workflow'
import { PricingPipelineEngine } from '@/domains/currency/pipeline'

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
