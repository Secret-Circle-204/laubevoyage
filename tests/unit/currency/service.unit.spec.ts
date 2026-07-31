import { describe, it, expect, vi } from 'vitest'
import { CurrencyService } from '@/domains/currency/service'
import { CurrencySyncPolicy, CurrencyConfigurationException } from '@/domains/currency/policy'
import type { ExchangeRateProvider } from '@/domains/currency/contracts/exchange-rate-provider'
import type { ExchangeRateSource } from '@/domains/currency/types'

describe('Currency / Service: Sync Orchestration Unit Tests', () => {
  const mockRepository = (latestSync: any, activeCurrencies: string[]) => ({
    getLatestRateSync: vi.fn().mockResolvedValue(latestSync),
    findActiveCurrencies: vi.fn().mockResolvedValue({
      docs: activeCurrencies.map(code => ({ isoCode: code })),
    }),
    upsertRate: vi.fn().mockResolvedValue(undefined),
    markAllStale: vi.fn().mockResolvedValue(undefined),
  } as any)

  const mockProvider = (name: string, source: ExchangeRateSource, rates: any, shouldFail = false) => ({
    name,
    source,
    hasApiKey: vi.fn().mockReturnValue(true),
    fetchRates: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error(`${name} down`)
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
    const result = await service.syncExchangeRates()

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(true)
    expect(p1.fetchRates).not.toHaveBeenCalled()
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

  it('should throw CurrencyConfigurationException if policy is missing for a provider', async () => {
    const repo = mockRepository(null, ['USD'])
    const badProvider = mockProvider('Bad', 'UNKNOWN' as any, { USD: 0.02 })

    const service = new CurrencyService(repo, badProvider)

    await expect(service.syncExchangeRates()).rejects.toThrow(CurrencyConfigurationException)
  })
})
