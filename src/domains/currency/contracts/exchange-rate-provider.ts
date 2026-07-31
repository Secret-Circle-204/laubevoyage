import type { ExchangeRateProviderResult, ExchangeRateSource } from '../types'

export interface ExchangeRateProvider {
  readonly name: string
  readonly source: ExchangeRateSource
  hasApiKey(): boolean
  fetchRates(baseCurrency: string): Promise<ExchangeRateProviderResult>
}
