import type { ExchangeRateProvider } from './types'

/**
 * ExchangeRate-API Open Provider (Free, Open, High-Availability Endpoint)
 * Endpoint: https://open.er-api.com/v6/latest/EGP
 *
 * Infrastructure layer — no business logic.
 * Direct live connection to real-time market exchange rates with base EGP.
 */
export class ExchangeRateApiProvider implements ExchangeRateProvider {
  readonly name = 'ExchangeRate-API'

  async fetchRates(baseCurrency = 'EGP'): Promise<Record<string, number>> {
    const url = `https://open.er-api.com/v6/latest/${baseCurrency}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`[ExchangeRateApiProvider] HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data || data.result !== 'success' || !data.rates) {
      throw new Error(`[ExchangeRateApiProvider] Invalid response format from API`)
    }

    return data.rates
  }
}
