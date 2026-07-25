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
  private readonly TTL_MS = 30 * 60 * 1000
  private repository?: CurrencyRepository

  private baseCurrency = 'EGP'

  private constructor() {
    this.cache.set(this.baseCurrency, {
      fromCurrency: this.baseCurrency,
      toCurrency: this.baseCurrency,
      rate: 1,
      source: 'System',
      lastUpdate: new Date().toISOString(),
    })
    this.initialized = false
    this.lastLoadedAt = 0
  }

  public static getInstance(): ExchangeRateRegistry {
    if (!ExchangeRateRegistry.instance) {
      ExchangeRateRegistry.instance = new ExchangeRateRegistry()
    }
    return ExchangeRateRegistry.instance
  }

  public setRepository(repository: CurrencyRepository): void {
    this.repository = repository
  }

  public async load(repository?: CurrencyRepository): Promise<void> {
    const repo = repository || this.repository
    const newCache = new Map<string, ExchangeRateData>()
    newCache.set(this.baseCurrency, {
      fromCurrency: this.baseCurrency,
      toCurrency: this.baseCurrency,
      rate: 1,
      source: 'System',
      lastUpdate: new Date().toISOString(),
    })

    if (repo) {
      try {
        const { docs } = await repo.findExchangeRates(this.baseCurrency)
        for (const doc of docs) {
          newCache.set(doc.toCurrency, {
            fromCurrency: doc.fromCurrency,
            toCurrency: doc.toCurrency,
            rate: doc.rate,
            source: doc.source || 'System',
            lastUpdate: doc.lastUpdate || new Date().toISOString(),
          })
        }
      } catch (err: unknown) {
        console.error('[ExchangeRateRegistry] Failed loading exchange rates:', err)
      }
    }

    this.cache = newCache
    this.initialized = true
    this.lastLoadedAt = Date.now()
  }

  public async getRate(targetCurrency: string, repository?: CurrencyRepository): Promise<ExchangeRateData | undefined> {
    const repo = repository || this.repository
    const isStale = Date.now() - this.lastLoadedAt > this.TTL_MS
    if (!this.initialized || isStale) {
      await this.load(repo)
    }
    return this.cache.get(targetCurrency)
  }

  public invalidate(): void {
    this.initialized = false
    this.lastLoadedAt = 0
  }
}

export const rateRegistry = ExchangeRateRegistry.getInstance()
