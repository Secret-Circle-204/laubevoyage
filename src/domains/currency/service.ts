import type { CurrencyCode, Money } from '@/types'
import { rateRegistry } from './rate-registry'
import { catalogRegistry } from './catalog-registry'
import { CurrencyRepository } from './repository'
import { CompositeExchangeRateProvider } from './providers/composite-provider'
import type { ExchangeRateProvider } from './providers/types'

/**
 * Currency Domain Service
 * Single source of truth for all currency operations via CurrencyRepository & Provider Dependency Injection.
 * Base currency: EGP
 */
export class CurrencyService {
  private repository: CurrencyRepository
  private rateProvider: ExchangeRateProvider

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

  async markAllStale(errorMessage: string, attemptTime: string) {
    return this.repository.markAllStale(errorMessage, attemptTime)
  }

  async upsertRate(params: {
    fromCurrency: string
    toCurrency: string
    rate: number
    source: 'OpenExchange' | 'ECB' | 'Fixer' | 'Manual'
    syncStatus: 'synced' | 'failed' | 'stale'
    timestamp: string
  }) {
    return this.repository.upsertRate(params)
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

    let updated = 0
    for (const [currency, rate] of Object.entries(rates)) {
      if (!rate) continue
      await this.repository.upsertRate({
        fromCurrency: 'EGP',
        toCurrency: currency,
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
   * Get exchange rate between two currencies
   */
  async getRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
    if (from !== 'EGP') {
      throw new Error('Base currency must be EGP')
    }

    const rateData = await rateRegistry.getRate(to, this.repository)
    if (!rateData) {
      throw new Error(`Exchange rate not found for EGP to ${to}`)
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
