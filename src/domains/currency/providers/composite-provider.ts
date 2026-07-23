import type { ExchangeRateProvider } from './types'
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

  private providers: ExchangeRateProvider[]

  constructor(customProviders?: ExchangeRateProvider[]) {
    this.providers = customProviders || [
      new ExchangeRateApiProvider(),
      new FawazAhmedCurrencyProvider(),
      new OpenExchangeProvider(),
    ]
  }

  async fetchRates(baseCurrency = 'EGP'): Promise<Record<string, number>> {
    const errors: string[] = []

    for (const provider of this.providers) {
      try {
        console.log(`[CurrencyPipeline] Attempting rate sync via provider: ${provider.name}`)
        const rates = await provider.fetchRates(baseCurrency)

        if (rates && Object.keys(rates).length > 0) {
          console.log(`[CurrencyPipeline] Rate sync successful via: ${provider.name}`)
          return rates
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
