import type { CurrencyRepository } from './repository'

export interface ExchangeRateData {
  fromCurrency: string
  toCurrency: string
  rate: number
  source: string
  lastUpdate: string
}

const RATE_REGISTRY_GLOBAL_KEY = Symbol.for('laube.currency.rate.registry.instance')

export class ExchangeRateRegistry {
  private cache: Map<string, ExchangeRateData> = new Map()
  private initialized = false
  private loadingPromise: Promise<void> | null = null
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
  }

  public static getInstance(): ExchangeRateRegistry {
    const globalContext = globalThis as unknown as Record<typeof RATE_REGISTRY_GLOBAL_KEY, ExchangeRateRegistry>
    if (!globalContext[RATE_REGISTRY_GLOBAL_KEY]) {
      globalContext[RATE_REGISTRY_GLOBAL_KEY] = new ExchangeRateRegistry()
    }
    return globalContext[RATE_REGISTRY_GLOBAL_KEY]
  }

  public setRepository(repository: CurrencyRepository): void {
    this.repository = repository
  }

  public async load(repository?: CurrencyRepository): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = (async () => {
      try {
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
            const activeCurrenciesRes = await repo.findActiveCurrencies()
            const activeIsoCodes = new Set(
              (activeCurrenciesRes.docs || []).map((c) => c.isoCode.toUpperCase().trim())
            )

            // 1. Duplicate ISO validation
            const seenActive = new Set<string>()
            for (const code of activeIsoCodes) {
              if (seenActive.has(code)) {
                throw new Error(`FATAL EXCHANGE CONFIGURATION ERROR: Duplicate active currency ISO code configured in CMS: ${code}`)
              }
              seenActive.add(code)
            }

            const { docs } = await repo.findExchangeRates(this.baseCurrency)
            const dbRates = new Map<string, any>()

            for (const doc of docs) {
              const toCurr = doc.toCurrency.toUpperCase().trim()

              // 2. Validate zero/negative rate
              if (doc.rate <= 0) {
                throw new Error(`FATAL EXCHANGE CONFIGURATION ERROR: Exchange rate for ${toCurr} is non-positive: ${doc.rate}`)
              }

              dbRates.set(toCurr, doc)
            }

            // 3. Verify every active currency has a valid rate
            for (const code of activeIsoCodes) {
              if (code === this.baseCurrency) continue
              if (!dbRates.has(code)) {
                throw new Error(`FATAL EXCHANGE CONFIGURATION ERROR: Active currency ${code} is active but no exchange rate exists.`)
              }
            }

            for (const [toCurr, doc] of dbRates.entries()) {
              // Inactive Currency Isolation Invariant:
              // Only load rates into runtime in-memory cache if currency is in activeIsoCodes (or is base currency).
              // Inactive currencies with pre-provisioned rates in DB remain strictly dormant in DB.
              if (toCurr !== this.baseCurrency && !activeIsoCodes.has(toCurr)) {
                continue
              }

              newCache.set(toCurr, {
                fromCurrency: doc.fromCurrency,
                toCurrency: doc.toCurrency,
                rate: doc.rate,
                source: doc.source || 'System',
                lastUpdate: doc.lastUpdate || new Date().toISOString(),
              })
            }
          } catch (err: unknown) {
            console.error('[ExchangeRateRegistry] Failed loading exchange rates:', err)
            throw err
          }
        }

        this.cache = newCache
        this.initialized = true
      } finally {
        this.loadingPromise = null
      }
    })()

    return this.loadingPromise
  }


  public async getRate(targetCurrency: string, repository?: CurrencyRepository): Promise<ExchangeRateData | undefined> {
    const repo = repository || this.repository
    if (!this.initialized) {
      await this.load(repo)
    }
    return this.cache.get(targetCurrency)
  }

  public invalidate(): void {
    this.initialized = false
    this.loadingPromise = null
  }

}

export const rateRegistry = ExchangeRateRegistry.getInstance()
