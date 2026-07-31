import type { ExchangeRateProvider } from '../contracts/exchange-rate-provider'
import type { ExchangeRateProviderResult } from '../types'
import { EXCHANGE_RATE_SOURCES } from '../types'

/**
 * Open Exchange Rates Provider (Free tier)
 * https://openexchangerates.org/
 *
 * Infrastructure layer — no business logic.
 * The free tier uses USD as the base currency.
 * We convert rates to our EGP base internally.
 */
export class OpenExchangeProvider implements ExchangeRateProvider {
  readonly name = 'openexchange'
  readonly source = EXCHANGE_RATE_SOURCES.OPEN_EXCHANGE
  private appId: string

  constructor() {
    this.appId = process.env.OPEN_EXCHANGE_APP_ID || ''
  }

  hasApiKey() {
    return !!this.appId
  }

  async fetchRates(baseCurrency: string): Promise<ExchangeRateProviderResult> {
    if (!this.appId) {
      throw new Error('[OpenExchangeProvider] OPEN_EXCHANGE_APP_ID environment variable is not set')
    }

    // Free tier always returns USD as base
    const url = `https://openexchangerates.org/api/latest.json?app_id=${this.appId}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`[OpenExchangeProvider] API returned status ${response.status}`)
    }

    const data = await response.json()

    if (!data || !data.rates) {
      throw new Error('[OpenExchangeProvider] Unexpected response structure')
    }

    // If the requested base is USD, return directly
    if (baseCurrency === 'USD') {
      return {
        source: EXCHANGE_RATE_SOURCES.OPEN_EXCHANGE,
        rates: data.rates,
      }
    }

    // Convert all rates relative to the requested base currency
    const baseRate = data.rates[baseCurrency]
    if (!baseRate) {
      throw new Error(`[OpenExchangeProvider] Rate for base currency "${baseCurrency}" not found`)
    }

    const rebased: Record<string, number> = {}
    for (const [currency, rate] of Object.entries(data.rates)) {
      rebased[currency] = (rate as number) / baseRate
    }

    return {
      source: EXCHANGE_RATE_SOURCES.OPEN_EXCHANGE,
      rates: rebased,
    }
  }
}
