/**
 * Decoupled Exchange Rate Provider Interface
 * Strategy pattern decoupling exchange rate fetching from PricingPipeline Engine.
 * Supports live APIs, offline vitest fallback maps, and custom rate sources.
 */
export interface IExchangeRateProvider {
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number>
}

/**
 * Default Exchange Rate Provider with static fallback rates for offline test environments.
 */
export class DefaultRateProvider implements IExchangeRateProvider {
  private fallbackRates: Record<string, number> = {
    EGP_EGP: 1.0,
    EGP_USD: 0.02, // 1 EGP = ~0.02 USD
    EGP_EUR: 0.018, // 1 EGP = ~0.018 EUR
    EGP_AED: 0.075, // 1 EGP = ~0.075 AED
    EGP_SAR: 0.076, // 1 EGP = ~0.076 SAR
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const key = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`
    return this.fallbackRates[key] || 1.0
  }
}
