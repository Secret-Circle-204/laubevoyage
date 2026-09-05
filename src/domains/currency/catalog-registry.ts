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
  flagCode?: string | null
}

const CATALOG_REGISTRY_GLOBAL_KEY = Symbol.for('laube.currency.catalog.registry.instance')

export class CurrencyCatalogRegistry {
  private cache: Map<string, CurrencyIdentity> = new Map()
  private initialized = false
  private loadingPromise: Promise<void> | null = null
  private repository?: CurrencyRepository

  private constructor() {}

  public static getInstance(): CurrencyCatalogRegistry {
    const globalContext = globalThis as unknown as Record<typeof CATALOG_REGISTRY_GLOBAL_KEY, CurrencyCatalogRegistry>
    if (!globalContext[CATALOG_REGISTRY_GLOBAL_KEY]) {
      globalContext[CATALOG_REGISTRY_GLOBAL_KEY] = new CurrencyCatalogRegistry()
    }
    return globalContext[CATALOG_REGISTRY_GLOBAL_KEY]
  }

  public setRepository(repository: CurrencyRepository): void {
    this.repository = repository
  }

  public async load(repository?: CurrencyRepository): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = (async () => {
      const repo = repository || this.repository
      if (!repo) {
        throw new Error(
          '[CurrencyCatalogRegistry] Cannot load catalog: CurrencyRepository is not initialized.',
        )
      }

      const newCache = new Map<string, CurrencyIdentity>()

      try {
        const { docs } = await repo.findActiveCurrencies()
        const seenIso = new Set<string>()
        let hasBaseCurrency = false

        for (const doc of docs) {
          const iso = doc.isoCode.toUpperCase().trim()
          if (seenIso.has(iso)) {
            throw new Error(
              `FATAL EXCHANGE CONFIGURATION ERROR: Duplicate active currency ISO code configured in CMS: ${iso}`,
            )
          }
          seenIso.add(iso)

          if (iso === 'EGP') {
            hasBaseCurrency = true
          }

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
            flagCode: doc.flagCode || null,
          })
        }

        if (!hasBaseCurrency) {
          throw new Error(
            'FATAL EXCHANGE CONFIGURATION ERROR: Platform base currency "EGP" is missing or inactive in currencies collection.',
          )
        }
      } catch (err: unknown) {
        console.error('[CurrencyCatalogRegistry] Failed loading currencies from repository:', err)
        throw err
      }

      this.cache = newCache
      this.initialized = true
    })().finally(() => {
      this.loadingPromise = null
    })

    return this.loadingPromise
  }

  public async get(isoCode: string, repository?: CurrencyRepository): Promise<CurrencyIdentity | undefined> {
    const repo = repository || this.repository
    if (!this.initialized) {
      await this.load(repo)
    }
    return this.cache.get(isoCode)
  }

  public async getAll(repository?: CurrencyRepository): Promise<CurrencyIdentity[]> {
    const repo = repository || this.repository
    if (!this.initialized) {
      await this.load(repo)
    }
    return Array.from(this.cache.values()).sort((a, b) => a.displayOrder - b.displayOrder)
  }

  public invalidate(): void {
    this.initialized = false
    this.loadingPromise = null
  }
}


export const catalogRegistry = CurrencyCatalogRegistry.getInstance()
