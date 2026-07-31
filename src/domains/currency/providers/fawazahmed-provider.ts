import type { ExchangeRateProvider } from '../contracts/exchange-rate-provider'
import type { ExchangeRateProviderResult } from '../types'
import { EXCHANGE_RATE_SOURCES } from '../types'

/**
 * FawazAhmed Currency API Provider (CDN-Backed Backup Provider)
 * Endpoint: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/egp.json
 *
 * Infrastructure layer — no business logic.
 * Backup rate provider if primary endpoint is temporarily unreachable.
 */
export class FawazAhmedCurrencyProvider implements ExchangeRateProvider {
  readonly name = 'FawazAhmed-CDN'
  readonly source = EXCHANGE_RATE_SOURCES.FAWAZ_AHMED

  hasApiKey() {
    return true
  }

  async fetchRates(baseCurrency = 'EGP'): Promise<ExchangeRateProviderResult> {
    const code = baseCurrency.toLowerCase()
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code}.json`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`[FawazAhmedCurrencyProvider] HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !data[code] || typeof data[code] !== 'object') {
      throw new Error(`[FawazAhmedCurrencyProvider] Invalid response format from CDN API`)
    }

    const rawRates: Record<string, number> = data[code]
    const uppercaseRates: Record<string, number> = {}

    for (const [key, value] of Object.entries(rawRates)) {
      if (typeof value === 'number') {
        uppercaseRates[key.toUpperCase()] = value
      }
    }

    return {
      source: EXCHANGE_RATE_SOURCES.FAWAZ_AHMED,
      rates: uppercaseRates,
    }
  }
}
