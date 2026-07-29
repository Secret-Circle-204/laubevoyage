import type { DestinationRepository } from './repository'
import { CountryMapper } from './mapper'

export interface CountryConfiguration {
  code: string
  name: string
  currencyCode?: string | null
  defaultLanguageCode?: string | null
  timezone?: string | null
  measurementSystem?: 'metric' | 'imperial' | string | null
  weekStart?: number | null
  isActive: boolean
}

export class CountryCatalogRegistry {
  private static instance: CountryCatalogRegistry
  private cache: Map<string, CountryConfiguration> = new Map()
  private initialized = false
  private lastLoadedAt = 0
  private readonly TTL_MS = 60 * 60 * 1000 // 1 Hour TTL
  private repository?: DestinationRepository

  private constructor() {}

  public static getInstance(): CountryCatalogRegistry {
    if (!CountryCatalogRegistry.instance) {
      CountryCatalogRegistry.instance = new CountryCatalogRegistry()
    }
    return CountryCatalogRegistry.instance
  }

  public setRepository(repository: DestinationRepository): void {
    this.repository = repository
  }

  public async load(repository?: DestinationRepository): Promise<void> {
    const repo = repository || this.repository
    const newCache = new Map<string, CountryConfiguration>()

    if (repo) {
      try {
        const { docs } = await repo.findCountries()
        for (const doc of docs) {
          const config = CountryMapper.toDomain(doc)
          newCache.set(config.code, config)
        }
      } catch (err: unknown) {
        console.error('[CountryCatalogRegistry] Failed loading countries from repository:', err)
      }
    }

    this.cache = newCache
    this.initialized = true
    this.lastLoadedAt = Date.now()
  }

  private isStale(): boolean {
    return Date.now() - this.lastLoadedAt > this.TTL_MS
  }

  public async get(code: string, repository?: DestinationRepository): Promise<CountryConfiguration | undefined> {
    const repo = repository || this.repository
    if (!this.initialized || this.isStale()) {
      await this.load(repo)
    }
    return this.cache.get(code.toUpperCase())
  }

  public async getAll(repository?: DestinationRepository): Promise<CountryConfiguration[]> {
    const repo = repository || this.repository
    if (!this.initialized || this.isStale()) {
      await this.load(repo)
    }
    return Array.from(this.cache.values())
  }

  public invalidate(): void {
    this.initialized = false
  }
}

export const countryCatalogRegistry = CountryCatalogRegistry.getInstance()
