import type { ExchangeRateProvider } from '../contracts/exchange-rate-provider'
import type { ExchangeRateProviderResult } from '../types'
import { EXCHANGE_RATE_SOURCES } from '../types'
import { ExchangeRateApiProvider } from './exchangerate-api'
import { FawazAhmedCurrencyProvider } from './fawazahmed-provider'
import { OpenExchangeProvider } from './openexchange'

/**
 * Composite Exchange Rate Provider with Automatic Multi-Provider Failover
 * Order of attempts:
 * 1. ExchangeRate-API (Open endpoint, Real-time)
 * 2. FawazAhmed Currency API (CDN Backed, Daily)
 * 3. OpenExchangeRates API (Key required if set)
 */
export class CompositeExchangeRateProvider implements ExchangeRateProvider {
  readonly name = 'Composite-Exchange-Pipeline'
  readonly source = EXCHANGE_RATE_SOURCES.EXCHANGE_RATE_API
  readonly providers: ExchangeRateProvider[]

  hasApiKey() {
    return true
  }

  constructor(customProviders?: ExchangeRateProvider[]) {
    this.providers = customProviders || [
      new ExchangeRateApiProvider(),
      new FawazAhmedCurrencyProvider(),
      new OpenExchangeProvider(),
    ]
  }

  async fetchRates(baseCurrency = 'EGP'): Promise<ExchangeRateProviderResult> {
    const errors: string[] = []

    for (const provider of this.providers) {
      try {
        console.log(`[CurrencyPipeline] Attempting rate sync via provider: ${provider.name}`)
        const result = await provider.fetchRates(baseCurrency)

        if (result.rates && Object.keys(result.rates).length > 0) {
          console.log(`[CurrencyPipeline] Rate sync successful via: ${provider.name}`)
          return result
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[CurrencyPipeline] Provider ${provider.name} failed: ${msg}`)
        errors.push(`${provider.name}: ${msg}`)
      }
    }

    throw new Error(`[CurrencyPipeline] All rate providers failed: ${errors.join(' | ')}`)
  }
}
