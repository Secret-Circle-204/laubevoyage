import type { ExchangeRateProvider } from './types'

/**
 * FawazAhmed Currency API Provider (CDN-Backed Backup Provider)
 * Endpoint: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/egp.json
 *
 * Infrastructure layer — no business logic.
 * Backup rate provider if primary endpoint is temporarily unreachable.
 */
export class FawazAhmedCurrencyProvider implements ExchangeRateProvider {
  readonly name = 'FawazAhmed-CDN'

  async fetchRates(baseCurrency = 'EGP'): Promise<Record<string, number>> {
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

    return uppercaseRates
  }
}
