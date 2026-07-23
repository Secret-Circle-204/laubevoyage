import type { CurrencyRepository } from './repository'

export interface ExchangeRateData {
  fromCurrency: string
  toCurrency: string
  rate: number
  source: string
  lastUpdate: string
}

class ExchangeRateRegistry {
  private static instance: ExchangeRateRegistry
  private cache: Map<string, ExchangeRateData> = new Map()
  private initialized = false
  private lastLoadedAt = 0
  private readonly TTL_MS = 15 * 60 * 1000

  private baseCurrency = 'EGP'

  private constructor() {
    this.cache.set(this.baseCurrency, {
      fromCurrency: this.baseCurrency,
      toCurrency: this.baseCurrency,
      rate: 1,
      source: 'System',
      lastUpdate: new Date().toISOString(),
    })
    this.initialized = true
    this.lastLoadedAt = Date.now()
  }

  public static getInstance(): ExchangeRateRegistry {
    if (!ExchangeRateRegistry.instance) {
      ExchangeRateRegistry.instance = new ExchangeRateRegistry()
    }
    return ExchangeRateRegistry.instance
  }

  public async load(repository?: CurrencyRepository): Promise<void> {
    const newCache = new Map<string, ExchangeRateData>()
    newCache.set(this.baseCurrency, {
      fromCurrency: this.baseCurrency,
      toCurrency: this.baseCurrency,
      rate: 1,
      source: 'System',
      lastUpdate: new Date().toISOString(),
    })

    if (repository) {
      try {
        const { docs } = await repository.findExchangeRates(this.baseCurrency)
        for (const doc of docs) {
          newCache.set(doc.toCurrency, {
            fromCurrency: doc.fromCurrency,
            toCurrency: doc.toCurrency,
            rate: doc.rate,
            source: doc.source || 'System',
            lastUpdate: doc.lastUpdate || new Date().toISOString(),
          })
        }
      } catch {
        // Fallback for offline/test
      }
    }

    this.cache = newCache
    this.initialized = true
    this.lastLoadedAt = Date.now()
  }

  public async getRate(targetCurrency: string, repository?: CurrencyRepository): Promise<ExchangeRateData | undefined> {
    const isStale = Date.now() - this.lastLoadedAt > this.TTL_MS
    if (!this.initialized || isStale) {
      await this.load(repository)
    }
    return this.cache.get(targetCurrency)
  }

  public invalidate(): void {
    this.initialized = false
  }
}

export const rateRegistry = ExchangeRateRegistry.getInstance()
