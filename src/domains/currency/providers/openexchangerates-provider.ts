import type { ExchangeRateProvider, ExchangeRateCatalog } from '../contracts/exchange-rate-provider'
import { CompositeExchangeRateProvider } from './composite-provider'

export class OpenExchangeRatesProvider implements ExchangeRateProvider {
  readonly providerId = 'openexchangerates'
  private compositeProvider: CompositeExchangeRateProvider

  constructor() {
    this.compositeProvider = new CompositeExchangeRateProvider()
  }

  async fetchLatestRates(baseCurrency = 'EGP'): Promise<ExchangeRateCatalog> {
    const rates = await this.compositeProvider.fetchRates(baseCurrency)

    return {
      baseCurrency,
      rates,
      updatedAt: new Date().toISOString(),
    }
  }
}

