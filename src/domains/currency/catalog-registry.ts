import { getPayload } from 'payload'
import configPromise from '@payload-config'

export interface CurrencyIdentity {
  isoCode: string
  numericCode: number
  name: string
  symbol: string
  nativeSymbol?: string | null
  decimals: number
  isActive: boolean
  displayOrder: number
  isDefault: boolean
}

class CurrencyCatalogRegistry {
  private static instance: CurrencyCatalogRegistry
  private cache: Map<string, CurrencyIdentity> = new Map()
  private initialized = false
  private lastLoadedAt = 0
  private readonly TTL_MS = 60 * 60 * 1000 // 1 hour TTL (currencies don't change often)

  private constructor() {
    this.cache = new Map<string, CurrencyIdentity>([
      ['EGP', { isoCode: 'EGP', numericCode: 818, name: 'Egyptian Pound', symbol: 'EGP', nativeSymbol: 'ج.م', decimals: 2, isActive: true, displayOrder: 1, isDefault: true }],
      ['USD', { isoCode: 'USD', numericCode: 840, name: 'US Dollar', symbol: '$', nativeSymbol: '$', decimals: 2, isActive: true, displayOrder: 2, isDefault: false }],
      ['EUR', { isoCode: 'EUR', numericCode: 978, name: 'Euro', symbol: '€', nativeSymbol: '€', decimals: 2, isActive: true, displayOrder: 3, isDefault: false }],
      ['AED', { isoCode: 'AED', numericCode: 784, name: 'UAE Dirham', symbol: 'AED', nativeSymbol: 'د.إ', decimals: 2, isActive: true, displayOrder: 4, isDefault: false }],
      ['SAR', { isoCode: 'SAR', numericCode: 682, name: 'Saudi Riyal', symbol: 'SAR', nativeSymbol: 'ر.س', decimals: 2, isActive: true, displayOrder: 5, isDefault: false }],
    ])
    this.initialized = true
    this.lastLoadedAt = Date.now()
  }

  public static getInstance(): CurrencyCatalogRegistry {
    if (!CurrencyCatalogRegistry.instance) {
      CurrencyCatalogRegistry.instance = new CurrencyCatalogRegistry()
    }
    return CurrencyCatalogRegistry.instance
  }

  public async load(): Promise<void> {
    const newCache = new Map<string, CurrencyIdentity>([
      ['EGP', { isoCode: 'EGP', numericCode: 818, name: 'Egyptian Pound', symbol: 'EGP', nativeSymbol: 'ج.م', decimals: 2, isActive: true, displayOrder: 1, isDefault: true }],
      ['USD', { isoCode: 'USD', numericCode: 840, name: 'US Dollar', symbol: '$', nativeSymbol: '$', decimals: 2, isActive: true, displayOrder: 2, isDefault: false }],
      ['EUR', { isoCode: 'EUR', numericCode: 978, name: 'Euro', symbol: '€', nativeSymbol: '€', decimals: 2, isActive: true, displayOrder: 3, isDefault: false }],
      ['AED', { isoCode: 'AED', numericCode: 784, name: 'UAE Dirham', symbol: 'AED', nativeSymbol: 'د.إ', decimals: 2, isActive: true, displayOrder: 4, isDefault: false }],
      ['SAR', { isoCode: 'SAR', numericCode: 682, name: 'Saudi Riyal', symbol: 'SAR', nativeSymbol: 'ر.س', decimals: 2, isActive: true, displayOrder: 5, isDefault: false }],
    ])

    try {
      const payload = await getPayload({ config: configPromise })
      const { docs } = await payload.find({
        collection: 'currencies',
        where: {
          isActive: {
            equals: true,
          },
        },
        limit: 1000,
        depth: 0,
      })

      for (const doc of docs) {
        newCache.set(doc.isoCode, {
          isoCode: doc.isoCode,
          numericCode: doc.numericCode,
          name: doc.name,
          symbol: doc.symbol,
          nativeSymbol: doc.nativeSymbol,
          decimals: doc.decimals,
          isActive: doc.isActive ?? true,
          displayOrder: doc.displayOrder ?? 0,
          isDefault: doc.isDefault ?? false,
        })
      }
    } catch {
      // Graceful fallback to default in-memory currencies in test/offline environments
    }

    this.cache = newCache
    this.initialized = true
    this.lastLoadedAt = Date.now()
  }

  private isStale(): boolean {
    return Date.now() - this.lastLoadedAt > this.TTL_MS
  }

  public async get(isoCode: string): Promise<CurrencyIdentity | undefined> {
    if (!this.initialized || this.isStale()) {
      await this.load()
    }
    return this.cache.get(isoCode)
  }

  public async getAll(): Promise<CurrencyIdentity[]> {
    if (!this.initialized || this.isStale()) {
      await this.load()
    }
    return Array.from(this.cache.values()).sort((a, b) => a.displayOrder - b.displayOrder)
  }

  public invalidate(): void {
    // This will force a reload on the next get()
    this.initialized = false
  }
}

export const catalogRegistry = CurrencyCatalogRegistry.getInstance()
