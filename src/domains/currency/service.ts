import type { CurrencyCode, Money } from '@/types'
import { rateRegistry } from './rate-registry'
import { catalogRegistry } from './catalog-registry'
import { CurrencyRepository } from './repository'
import { CompositeExchangeRateProvider } from './providers/composite-provider'
import type { ExchangeRateProvider } from './providers/types'
import { ExchangeRateUnavailableError } from './types'

/**
 * Currency Domain Service
 * Single source of truth for all currency operations via CurrencyRepository & Provider Dependency Injection.
 * Base currency: EGP
 */
export class CurrencyService {
  private repository: CurrencyRepository
  private rateProvider: ExchangeRateProvider
  private static syncPromise: Promise<{ success: boolean; message: string; timestamp: string }> | null = null

  constructor(repository: CurrencyRepository, rateProvider?: ExchangeRateProvider) {
    this.repository = repository
    this.rateProvider = rateProvider || new CompositeExchangeRateProvider()
  }

  /**
   * Domain Gateway method for retrieving all active currencies from catalog registry.
   */
  async getActiveCurrencies() {
    return catalogRegistry.getAll(this.repository)
  }

  /**
   * Domain Resolution Policy: Resolves a proposed currency against supported active currencies.
   * Business Policy:
   * 1. If proposed currency is active in catalogRegistry -> returns it.
   * 2. If proposed currency is unsupported (e.g. JPY) -> returns 'USD' (International Tourism Benchmark).
   * 3. Fallback -> 'EGP' (Platform Base Currency).
   */
  async resolveDisplayCurrency(proposedCurrency?: string): Promise<string> {
    if (!proposedCurrency) return 'USD'
    const code = proposedCurrency.trim().toUpperCase()
    const activeCurrencies = await this.getActiveCurrencies()
    const supportedCodes = new Set(activeCurrencies.map((c) => c.isoCode.toUpperCase()))

    if (supportedCodes.has(code)) {
      return code
    }

    if (supportedCodes.has('USD')) {
      return 'USD'
    }

    return 'EGP'
  }

  async markAllStale(errorMessage: string, attemptTime: string) {
    const result = await this.repository.markAllStale(errorMessage, attemptTime)
    rateRegistry.invalidate()
    return result
  }

  async upsertRate(params: {
    fromCurrency: string
    toCurrency: string
    rate: number
    source: 'OpenExchange' | 'ECB' | 'Fixer' | 'Manual'
    syncStatus: 'synced' | 'failed' | 'stale'
    timestamp: string
  }) {
    const result = await this.repository.upsertRate(params)
    rateRegistry.invalidate()
    return result
  }

  async syncExchangeRates(): Promise<{ success: boolean; message: string; timestamp: string }> {
    let rates: Record<string, number> = {}
    let source: 'OpenExchange' | 'ECB' | 'Fixer' | 'Manual' = 'OpenExchange'
    let syncStatus: 'synced' | 'failed' | 'stale' = 'synced'

    const now = new Date().toISOString()

    try {
      rates = await this.rateProvider.fetchRates('EGP')
    } catch (primaryError) {
      console.error('[CurrencyService] Primary Rate Provider Failed:', primaryError)
      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError)
      try {
        await this.repository.markAllStale(primaryMsg, now)
        rateRegistry.invalidate()
      } catch (dbError) {
        console.error('[CurrencyService] Failed marking rates as stale:', dbError)
      }
      return { success: false, message: 'All providers failed. Kept old rates but marked as STALE.', timestamp: now }
    }

    const activeCurrencies = await this.repository.findActiveCurrencies()
    const activeIsoCodes = new Set(activeCurrencies.docs.map(c => c.isoCode.toUpperCase()))

    let updated = 0
    for (const [currency, rate] of Object.entries(rates)) {
      if (!rate) continue
      const currencyUpper = currency.toUpperCase()
      if (!activeIsoCodes.has(currencyUpper)) continue

      await this.repository.upsertRate({
        fromCurrency: 'EGP',
        toCurrency: currencyUpper,
        rate,
        source,
        syncStatus,
        timestamp: now,
      })
      updated++
    }

    rateRegistry.invalidate()
    return { success: true, message: `Updated ${updated} exchange rates`, timestamp: now }
  }

  /**
   * Convert amount from one currency to another using the Rate Registry
   */
  async convert(from: CurrencyCode, to: CurrencyCode, amount: number): Promise<number> {
    if (from === to) return amount

    const rate = await this.getRate(from, to)
    return amount * rate
  }

  /**
   * Run syncExchangeRates with a single-flight mutex and a 10s timeout to prevent API spamming
   */
  async syncExchangeRatesSingleFlight(): Promise<{ success: boolean; message: string; timestamp: string }> {
    if (CurrencyService.syncPromise) {
      console.log('[CurrencySync] Existing sync detected. Awaiting...')
      return CurrencyService.syncPromise
    }

    console.log('[CurrencySync] Starting auto-sync...')

    let timeoutId: NodeJS.Timeout
    const timeoutPromise = new Promise<{ success: boolean; message: string; timestamp: string }>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Sync timed out after 10000ms')), 10000)
    })

    CurrencyService.syncPromise = Promise.race([
      this.syncExchangeRates(),
      timeoutPromise
    ]).finally(() => {
      clearTimeout(timeoutId)
      CurrencyService.syncPromise = null
    })

    try {
      const result = await CurrencyService.syncPromise
      console.log('[CurrencySync] Auto-sync completed.')
      return result
    } catch (err: unknown) {
      console.error('[CurrencySync] Auto-sync failed:', err)
      throw err
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  async getRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
    if (from !== 'EGP') {
      throw new Error('Base currency must be EGP')
    }

    let rateData = await rateRegistry.getRate(to, this.repository)
    if (!rateData) {
      console.warn(`[CurrencyService] Exchange rate for ${to} not found. Triggering auto-sync...`)
      try {
        await this.syncExchangeRatesSingleFlight()
      } catch (err: unknown) {
        console.error('[CurrencyService] Auto-sync failed during rate lookup:', err)
      }
      rateData = await rateRegistry.getRate(to, this.repository)
    }

    if (!rateData) {
      console.error(
        `[CurrencyService] Conversion failed: Exchange rate from ${from} to ${to} is completely missing in database and cache after sync attempt. ` +
        `Timestamp: ${new Date().toISOString()}`
      )
      throw new ExchangeRateUnavailableError(from, to, 'Rate missing in database and cache')
    }

    return rateData.rate
  }

  /**
   * Convert Money object to another currency
   */
  async convertMoney(money: Money, toCurrency: CurrencyCode): Promise<Money> {
    const convertedAmount = await this.convert(money.currency, toCurrency, money.amount)
    return {
      amount: convertedAmount,
      currency: toCurrency,
    }
  }

  /**
   * Convert points to currency value
   * 1 point = 0.5 EGP base value
   */
  async pointsToCurrency(points: number, currency: CurrencyCode): Promise<number> {
    const egpValue = points * 0.5
    return this.convert('EGP', currency, egpValue)
  }

  /**
   * Format money for display
   */
  formatMoney(money: Money, locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
    }).format(money.amount)
  }

  /**
   * Capture an immutable exchange rate snapshot for booking creation
   */
  async getExchangeRateSnapshot(targetCurrency: string): Promise<{ rate: number; timestamp: string }> {
    if (targetCurrency === 'EGP') {
      return { rate: 1, timestamp: new Date().toISOString() }
    }
    try {
      const rate = await this.getRate('EGP', targetCurrency as CurrencyCode)
      return { rate, timestamp: new Date().toISOString() }
    } catch {
      // If missing from cache, trigger live rate sync immediately
      await this.syncExchangeRates()
      const rate = await this.getRate('EGP', targetCurrency as CurrencyCode)
      return { rate, timestamp: new Date().toISOString() }
    }
  }

  /**
   * Background rate refresh for cron dispatcher
   */
  async refreshRateCatalog(): Promise<{ success: boolean; message: string }> {
    return this.syncExchangeRates()
  }
}
