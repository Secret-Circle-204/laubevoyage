import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CurrencyService } from '@/domains/currency/service'
import { CurrencySyncPolicy, CurrencyConfigurationException } from '@/domains/currency/policy'
import type { ExchangeRateProvider } from '@/domains/currency/contracts/exchange-rate-provider'
import type { ExchangeRateSource } from '@/domains/currency/types'
import { ExchangeRateUnavailableError } from '@/domains/currency/types'
import { rateRegistry } from '@/domains/currency/rate-registry'
import { PricingPipeline } from '@/domains/currency/pipeline'
import { PricingFacade } from '@/domains/currency/facade'

describe('Currency / Service: Sync Orchestration & Request-Path Isolation Unit Tests', () => {
  beforeEach(() => {
    rateRegistry.invalidate()
  })

  const mockRepository = (latestSync: any, activeCurrencies: string[], exchangeRates: any[] = []) => ({
    getLatestRateSync: vi.fn().mockResolvedValue(latestSync),
    findActiveCurrencies: vi.fn().mockResolvedValue({
      docs: activeCurrencies.map(code => ({ isoCode: code })),
    }),
    findExchangeRates: vi.fn().mockResolvedValue({
      docs: exchangeRates,
    }),
    upsertRate: vi.fn().mockResolvedValue(undefined),
    markAllStale: vi.fn().mockResolvedValue(undefined),
  } as any)

  const mockProvider = (name: string, source: ExchangeRateSource, rates: any, shouldFail = false, causeError?: any) => ({
    name,
    source,
    hasApiKey: vi.fn().mockReturnValue(true),
    fetchRates: vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        const err = new Error(`${name} connection failed`)
        if (causeError) {
          ;(err as any).cause = causeError
        }
        throw err
      }
      return { source, rates }
    }),
  } as ExchangeRateProvider)

  it('should sync from primary provider first and stop if successful', async () => {
    const repo = mockRepository(null, ['USD', 'EUR'])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { USD: 0.02, EUR: 0.018 })
    const p2 = mockProvider('FawazAhmed-CDN', 'FawazAhmed-CDN', { USD: 0.021, EUR: 0.019 })

    const service = new CurrencyService(repo, {
      name: 'Composite',
      source: 'ExchangeRate-API',
      hasApiKey: () => true,
      providers: [p2, p1], // order in list doesn't matter, policy orders it
      fetchRates: async () => ({ source: 'ExchangeRate-API', rates: {} }),
    } as any)

    const result = await service.syncExchangeRates()

    expect(result.success).toBe(true)
    expect(result.message).toContain('ExchangeRate-API')
    expect(p1.fetchRates).toHaveBeenCalled()
    expect(p2.fetchRates).not.toHaveBeenCalled()
    expect(repo.upsertRate).toHaveBeenCalledTimes(2)
  })

  it('should skip sync entirely if rates in DB are still fresh', async () => {
    const freshTime = new Date(Date.now() - 1000 * 60).toISOString() // 1 min ago
    const repo = mockRepository({ source: 'ExchangeRate-API', lastSuccess: freshTime }, ['USD'])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { USD: 0.02 })

    const service = new CurrencyService(repo, p1)
    const result = await service.syncExchangeRates(false)

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(true)
    expect(p1.fetchRates).not.toHaveBeenCalled()
  })

  it('should bypass freshness gate and perform sync when force=true', async () => {
    const freshTime = new Date(Date.now() - 1000 * 60).toISOString() // 1 min ago
    const repo = mockRepository({ source: 'ExchangeRate-API', lastSuccess: freshTime }, ['USD'])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { USD: 0.02 })

    const service = new CurrencyService(repo, p1)
    const result = await service.syncExchangeRates(true)

    expect(result.success).toBe(true)
    expect(result.skipped).toBeUndefined()
    expect(p1.fetchRates).toHaveBeenCalled()
    expect(repo.upsertRate).toHaveBeenCalled()
  })

  it('should fall back to secondary provider if primary fails', async () => {
    const repo = mockRepository(null, ['USD'])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', {}, true) // Fails
    const p2 = mockProvider('FawazAhmed-CDN', 'FawazAhmed-CDN', { USD: 0.02 })

    const service = new CurrencyService(repo, {
      name: 'Composite',
      source: 'ExchangeRate-API',
      hasApiKey: () => true,
      providers: [p1, p2],
      fetchRates: async () => ({ source: 'ExchangeRate-API', rates: {} }),
    } as any)

    const result = await service.syncExchangeRates()

    expect(result.success).toBe(true)
    expect(result.message).toContain('FawazAhmed-CDN')
    expect(p1.fetchRates).toHaveBeenCalled()
    expect(p2.fetchRates).toHaveBeenCalled()
  })

  it('should preserve err.cause diagnostics when all providers fail', async () => {
    const repo = mockRepository(null, ['USD'])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', {}, true, { code: 'ENOTFOUND', hostname: 'open.er-api.com' })
    const p2 = mockProvider('FawazAhmed-CDN', 'FawazAhmed-CDN', {}, true, { code: 'ETIMEDOUT', message: 'connection timed out' })

    const service = new CurrencyService(repo, {
      name: 'Composite',
      source: 'ExchangeRate-API',
      hasApiKey: () => true,
      providers: [p1, p2],
      fetchRates: async () => ({ source: 'ExchangeRate-API', rates: {} }),
    } as any)

    const result = await service.syncExchangeRates()

    expect(result.success).toBe(false)
    expect(repo.markAllStale).toHaveBeenCalled()
    const recordedError = repo.markAllStale.mock.calls[0][0]
    expect(recordedError).toContain('[ENOTFOUND]')
    expect(recordedError).toContain('host: open.er-api.com')
    expect(recordedError).toContain('[ETIMEDOUT]')
  })

  it('should throw CurrencyConfigurationException if policy is missing for a provider', async () => {
    const repo = mockRepository(null, ['USD'])
    const badProvider = mockProvider('Bad', 'UNKNOWN' as any, { USD: 0.02 })

    const service = new CurrencyService(repo, badProvider)

    await expect(service.syncExchangeRates()).rejects.toThrow(CurrencyConfigurationException)
  })

  it('getRate() MUST be strictly read-only and return stored rate with ZERO network calls', async () => {
    const repo = mockRepository(null, ['USD'], [
      { fromCurrency: 'EGP', toCurrency: 'USD', rate: 0.02, syncStatus: 'synced' },
    ])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { USD: 0.02 })
    const service = new CurrencyService(repo, p1)

    const rate = await service.getRate('EGP', 'USD')

    expect(rate).toBe(0.02)
    expect(p1.fetchRates).not.toHaveBeenCalled()
  })

  it('getRate() MUST return stale rates as business continuity fallback with ZERO network calls', async () => {
    const repo = mockRepository(null, ['USD'], [
      { fromCurrency: 'EGP', toCurrency: 'USD', rate: 0.019, syncStatus: 'stale' },
    ])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { USD: 0.02 })
    const service = new CurrencyService(repo, p1)

    const rate = await service.getRate('EGP', 'USD')

    expect(rate).toBe(0.019)
    expect(p1.fetchRates).not.toHaveBeenCalled()
  })

  it('getRate() MUST fail fast when rate is missing with ZERO network calls', async () => {
    const repo = mockRepository(null, ['EUR'], []) // Active EUR, but DB has 0 rates
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { EUR: 0.018 })
    const service = new CurrencyService(repo, p1)

    await expect(service.getRate('EGP', 'EUR')).rejects.toThrow('FATAL EXCHANGE CONFIGURATION ERROR: Active currency EUR is active but no exchange rate exists.')
    expect(p1.fetchRates).not.toHaveBeenCalled()
  })

  it('End-to-End Pricing Pipeline MUST fail fast on missing rate without executing any provider fetch', async () => {
    const repo = mockRepository(null, ['GBP'], [])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { GBP: 0.015 })
    const service = new CurrencyService(repo, p1)

    const rateProvider = {
      getExchangeRate: async (from: string, to: string) => {
        return service.getRate(from as any, to as any)
      },
    }
    const settingsProvider = {
      getSettings: async () => ({
        vatRate: 0.14,
        vatEnabled: false,
        pricesIncludeVat: false,
      }),
    }

    const pipeline = new PricingPipeline(rateProvider as any, settingsProvider as any)
    const facade = new PricingFacade(pipeline)

    await expect(
      facade.getConvertedPrice(1000, 'GBP', 'en')
    ).rejects.toThrow('FATAL EXCHANGE CONFIGURATION ERROR: Active currency GBP is active but no exchange rate exists.')

    expect(p1.fetchRates).not.toHaveBeenCalled()
  })

  it('MaintenanceWorkflowEngine MUST execute currency_rate_refresh with startedBy=scheduler (force=false)', async () => {
    const { MaintenanceWorkflowEngine } = await import('@/domains/maintenance/workflow')
    const repo = mockRepository(null, ['USD'])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { USD: 0.02 })
    const currencyService = new CurrencyService(repo, p1)

    const syncSpy = vi.spyOn(currencyService, 'syncExchangeRates')

    const mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    } as any

    const workflowEngine = new MaintenanceWorkflowEngine(mockPayload, {} as any, currencyService)

    const result = await workflowEngine.executeJobWorkflow('currency_rate_refresh', 'scheduler', 'worker_cron_1')

    expect(result.success).toBe(true)
    expect(syncSpy).toHaveBeenCalledWith(false)
  })

  it('MaintenanceWorkflowEngine MUST execute currency_rate_refresh with startedBy=manual_admin (force=true)', async () => {
    const { MaintenanceWorkflowEngine } = await import('@/domains/maintenance/workflow')
    const freshTime = new Date().toISOString()
    const repo = mockRepository({ source: 'ExchangeRate-API', lastSuccess: freshTime }, ['USD'])
    const p1 = mockProvider('ExchangeRate-API', 'ExchangeRate-API', { USD: 0.02 })
    const currencyService = new CurrencyService(repo, p1)

    const syncSpy = vi.spyOn(currencyService, 'syncExchangeRates')

    const mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    } as any

    const workflowEngine = new MaintenanceWorkflowEngine(mockPayload, {} as any, currencyService)

    const result = await workflowEngine.executeJobWorkflow('currency_rate_refresh', 'manual_admin', 'admin_worker_1')

    expect(result.success).toBe(true)
    expect(syncSpy).toHaveBeenCalledWith(true)
  })
})
