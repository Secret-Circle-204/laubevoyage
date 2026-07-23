import type { CurrencyCode, Money } from '@/types'
import { rateRegistry } from './rate-registry'
import { CurrencyRepository } from './repository'

/**
 * Currency Domain Service
 * Single source of truth for all currency operations via CurrencyRepository Dependency Injection.
 * Base currency: EGP
 */
export class CurrencyService {
  private repository: CurrencyRepository

  constructor(repository: CurrencyRepository) {
    this.repository = repository
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
}
