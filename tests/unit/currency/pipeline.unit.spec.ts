import { describe, it, expect } from 'vitest'
import { PricingPipelineEngine } from '@/domains/currency/pipeline'
import { DefaultRateProvider } from '@/domains/currency/providers/rate-provider'
import { ExchangeRateUnavailableError } from '@/domains/currency/types'

describe('Experience / Currency Domain: Pricing Pipeline Engine Unit Tests', () => {
  it('should generate versioned PricingSnapshotData with full auditTrace', async () => {
    const mockRateProvider = {
      getExchangeRate: async (fromCurrency: string, toCurrency: string): Promise<number> => {
        if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1.0
        if (fromCurrency.toUpperCase() === 'EGP' && toCurrency.toUpperCase() === 'USD') {
          return 0.02
        }
        return 1.0
      }
    }
    const pipeline = new PricingPipelineEngine(mockRateProvider)

    const snapshot = await pipeline.calculatePricingSnapshot(2000, {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: 'USD',
      travelers: { adults: 1, children: 0 },
      bookingDate: '2026-08-03',
    })

    expect(snapshot.snapshotId).toContain('snap_')
    expect(snapshot.snapshotVersion).toBe('v1')
    expect(snapshot.displayCurrency).toBe('USD')
    expect(snapshot.displayAmount).toBeGreaterThan(0)
    expect(snapshot.auditTrace.length).toBeGreaterThanOrEqual(2)
  })

  it('should throw ExchangeRateUnavailableError in DefaultRateProvider when rate is completely missing', async () => {
    const provider = new DefaultRateProvider()
    await expect(provider.getExchangeRate('EGP', 'UNKNOWN_XYZ')).rejects.toThrow(ExchangeRateUnavailableError)
  })

  it('should propagate ExchangeRateUnavailableError from provider during pricing snapshot calculation', async () => {
    const badProvider = {
      getExchangeRate: async () => {
        throw new ExchangeRateUnavailableError('EGP', 'BAD', 'Test failure')
      }
    }
    const pipeline = new PricingPipelineEngine(badProvider)
    await expect(pipeline.calculatePricingSnapshot(2000, {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: 'BAD',
      travelers: { adults: 1 },
      bookingDate: '2026-08-03',
    })).rejects.toThrow(ExchangeRateUnavailableError)
  })

  it('should compute zero tax when vatEnabled is false', async () => {
    const mockRateProvider = {
      getExchangeRate: async () => 1.0
    }
    const mockSettingsProvider = {
      getSettings: async () => ({
        vatRate: 0.14,
        vatEnabled: false,
        pricesIncludeVat: false
      })
    }
    const pipeline = new PricingPipelineEngine(mockRateProvider, mockSettingsProvider)
    const snapshot = await pipeline.calculatePricingSnapshot(1000, {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: 'EGP',
      travelers: { adults: 1 },
      bookingDate: '2026-08-03',
    })

    expect(snapshot.taxesApplied).toBe(0)
    expect(snapshot.subtotalEGP).toBe(1000)
    expect(snapshot.auditTrace.some(step => step.stepName === 'TAX_VAT_DISABLED')).toBe(true)
  })

  it('should compute inclusive tax when pricesIncludeVat is true', async () => {
    const mockRateProvider = {
      getExchangeRate: async () => 1.0
    }
    const mockSettingsProvider = {
      getSettings: async () => ({
        vatRate: 0.14,
        vatEnabled: true,
        pricesIncludeVat: true
      })
    }
    const pipeline = new PricingPipelineEngine(mockRateProvider, mockSettingsProvider)
    const snapshot = await pipeline.calculatePricingSnapshot(1140, {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: 'EGP',
      travelers: { adults: 1 },
      bookingDate: '2026-08-03',
    })

    // 1140 includes 14% tax. Net price = 1000, Tax = 140.
    expect(snapshot.taxesApplied).toBe(140)
    expect(snapshot.subtotalEGP).toBe(1140)
    expect(snapshot.auditTrace.some(step => step.stepName === 'TAX_VAT_14')).toBe(true)
  })
})


