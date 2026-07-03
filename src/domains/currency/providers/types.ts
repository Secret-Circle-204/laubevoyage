/**
 * Exchange Rate Provider Interface
 * All exchange rate data sources must implement this contract.
 * Swapping providers (OpenExchange, Fixer, XE) requires zero changes
 * in the Currency Domain or any other service.
 */
export interface ExchangeRateProvider {
  /** Unique provider identifier (e.g. 'openexchange', 'fixer') */
  readonly name: string

  /**
   * Fetch current exchange rates for a base currency.
   * Returns a map of currency code → rate.
   * @throws Error if the provider fails (network, quota, etc.)
   */
  fetchRates(baseCurrency: string): Promise<Record<string, number>>
}
