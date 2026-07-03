import { CurrencyCode, type ExchangeRate, type Money } from '@/types'
import type { Payload } from 'payload'

/**
 * Currency Domain Service
 * Single source of truth for all currency operations
 * Base currency: EGP
 */
export class CurrencyService {
  private payload: Payload
  private rateCache: Map<string, ExchangeRate> = new Map()
  private cacheExpiry = 1000 * 60 * 60 // 1 hour

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Convert amount from one currency to another
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
    const cacheKey = `${from}_${to}`
    const cached = this.rateCache.get(cacheKey)

    if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheExpiry) {
      return cached.rate
    }

    const rateDoc = await this.payload.find({
      collection: 'exchange-rates',
      where: {
        and: [
          { fromCurrency: { equals: from } },
          { toCurrency: { equals: to } },
          { isActive: { equals: true } },
        ],
      },
      limit: 1,
    })

    if (rateDoc.docs.length === 0) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`)
    }

    const rate: ExchangeRate = {
      from,
      to,
      rate: rateDoc.docs[0].rate,
      lastUpdated: new Date(rateDoc.docs[0].updatedAt),
    }

    this.rateCache.set(cacheKey, rate)
    return rate.rate
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
    return this.convert(CurrencyCode.EGP, currency, egpValue)
  }

  /**
   * Update exchange rate
   */
  async updateRate(from: CurrencyCode, to: CurrencyCode, rate: number): Promise<void> {
    await this.payload.update({
      collection: 'exchange-rates',
      where: {
        and: [{ fromCurrency: { equals: from } }, { toCurrency: { equals: to } }],
      },
      data: {
        rate,
        isActive: true,
      },
    })

    // Clear cache
    this.rateCache.delete(`${from}_${to}`)
  }

  /**
   * Format money for display
   */
  formatMoney(money: Money, locale: string = 'en'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
    }).format(money.amount)
  }
}
