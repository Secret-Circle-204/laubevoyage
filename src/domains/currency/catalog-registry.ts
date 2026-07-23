import type { CurrencyRepository } from './repository'

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
  private readonly TTL_MS = 60 * 60 * 1000

  private constructor() {}

  public static getInstance(): CurrencyCatalogRegistry {
    if (!CurrencyCatalogRegistry.instance) {
      CurrencyCatalogRegistry.instance = new CurrencyCatalogRegistry()
    }
    return CurrencyCatalogRegistry.instance
  }

  public async load(repository?: CurrencyRepository): Promise<void> {
    const newCache = new Map<string, CurrencyIdentity>()

    if (repository) {
      try {
        const { docs } = await repository.findActiveCurrencies()
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
      } catch (err: unknown) {
        console.error('[CurrencyCatalogRegistry] Failed loading currencies from repository:', err)
      }
    }

    this.cache = newCache
    this.initialized = true
    this.lastLoadedAt = Date.now()
  }

  private isStale(): boolean {
    return Date.now() - this.lastLoadedAt > this.TTL_MS
  }

  public async get(isoCode: string, repository?: CurrencyRepository): Promise<CurrencyIdentity | undefined> {
    if (!this.initialized || this.isStale()) {
      await this.load(repository)
    }
    return this.cache.get(isoCode)
  }

  public async getAll(repository?: CurrencyRepository): Promise<CurrencyIdentity[]> {
    if (!this.initialized || this.isStale()) {
      await this.load(repository)
    }
    return Array.from(this.cache.values()).sort((a, b) => a.displayOrder - b.displayOrder)
  }

  public invalidate(): void {
    this.initialized = false
  }
}

export const catalogRegistry = CurrencyCatalogRegistry.getInstance()
