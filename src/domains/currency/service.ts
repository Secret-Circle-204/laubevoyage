import type { CurrencyCode, Money } from '@/types'
import { rateRegistry } from './rate-registry'

/**
 * Currency Domain Service
 * Single source of truth for all currency operations.
 * Base currency: EGP
 */
export class CurrencyService {
  constructor() {}

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

    const rateData = await rateRegistry.getRate(to)
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
