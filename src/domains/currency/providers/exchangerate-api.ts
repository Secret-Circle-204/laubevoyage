import type { ExchangeRateProvider } from '../contracts/exchange-rate-provider'
import type { ExchangeRateProviderResult } from '../types'
import { EXCHANGE_RATE_SOURCES } from '../types'

/**
 * ExchangeRate-API Open Provider (Free, Open, High-Availability Endpoint)
 * Endpoint: https://open.er-api.com/v6/latest/EGP
 *
 * Infrastructure layer — no business logic.
 * Direct live connection to real-time market exchange rates with base EGP.
 */
export class ExchangeRateApiProvider implements ExchangeRateProvider {
  readonly name = 'ExchangeRate-API'
  readonly source = EXCHANGE_RATE_SOURCES.EXCHANGE_RATE_API

  hasApiKey() {
    return true
  }

  async fetchRates(baseCurrency = 'EGP'): Promise<ExchangeRateProviderResult> {
    const url = `https://open.er-api.com/v6/latest/${baseCurrency}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) {
      throw new Error(`[ExchangeRateApiProvider] HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data || data.result !== 'success' || !data.rates) {
      throw new Error(`[ExchangeRateApiProvider] Invalid response format from API`)
    }

    return {
      source: EXCHANGE_RATE_SOURCES.EXCHANGE_RATE_API,
      rates: data.rates,
    }
  }
}
