import { rateRegistry } from '../rate-registry'
import { ExchangeRateUnavailableError } from '../types'

/**
 * Decoupled Exchange Rate Provider Interface
 * Strategy pattern decoupling exchange rate fetching from PricingPipeline Engine.
 */
export interface IExchangeRateProvider {
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number>
}

/**
 * Default Exchange Rate Provider communicating with Rate Registry.
 * Dumb Provider: Simply reads from the Registry cache and throws if missing.
 */
export class DefaultRateProvider implements IExchangeRateProvider {
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1.0

    const rateData = await rateRegistry.getRate(toCurrency)
    if (!rateData) {
      throw new ExchangeRateUnavailableError(fromCurrency, toCurrency, 'Rate missing in database and cache')
    }

    return rateData.rate
  }
}


