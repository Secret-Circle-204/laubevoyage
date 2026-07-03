import { getPayload } from 'payload'
import configPromise from '@payload-config'

export interface ExchangeRateData {
  fromCurrency: string
  toCurrency: string
  rate: number
  source: string
  lastUpdate: string // ISO string
}

class ExchangeRateRegistry {
  private static instance: ExchangeRateRegistry
  private cache: Map<string, ExchangeRateData> = new Map() // Key: toCurrency
  private initialized = false
  private baseCurrency = 'EGP'

  private constructor() {}

  public static getInstance(): ExchangeRateRegistry {
    if (!ExchangeRateRegistry.instance) {
      ExchangeRateRegistry.instance = new ExchangeRateRegistry()
    }
    return ExchangeRateRegistry.instance
  }

  public async load(): Promise<void> {
    const payload = await getPayload({ config: configPromise })
    const { docs } = await payload.find({
      collection: 'exchange-rates',
      where: {
        fromCurrency: {
          equals: this.baseCurrency,
        },
      },
      limit: 1000,
      depth: 0,
    })

    const newCache = new Map<string, ExchangeRateData>()
    // Always add the base currency itself
    newCache.set(this.baseCurrency, {
      fromCurrency: this.baseCurrency,
      toCurrency: this.baseCurrency,
      rate: 1,
      source: 'System',
      lastUpdate: new Date().toISOString(),
    })

    for (const doc of docs) {
      newCache.set(doc.toCurrency, {
        fromCurrency: doc.fromCurrency,
        toCurrency: doc.toCurrency,
        rate: doc.rate,
        source: doc.source || 'System',
        lastUpdate: doc.lastUpdate || new Date().toISOString(),
      })
    }

    this.cache = newCache
    this.initialized = true
  }

  public async getRate(targetCurrency: string): Promise<ExchangeRateData | undefined> {
    if (!this.initialized) {
      await this.load()
    }
    return this.cache.get(targetCurrency)
  }

  public invalidate(): void {
    this.initialized = false
  }
}

export const rateRegistry = ExchangeRateRegistry.getInstance()
