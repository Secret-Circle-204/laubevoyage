export interface ExchangeRateCatalog {
  baseCurrency: string
  rates: Record<string, number>
  updatedAt: string
}

export interface ExchangeRateProvider {
  readonly providerId: string

  fetchLatestRates(baseCurrency?: string): Promise<ExchangeRateCatalog>
}
