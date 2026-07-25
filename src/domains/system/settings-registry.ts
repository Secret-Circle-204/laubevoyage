import type { SystemRepository } from './repository'

export interface SystemSettingsData {
  vatRate: number
  pricesIncludeVat: boolean
  vatEnabled: boolean
  baseCurrency: string
  defaultDisplayCurrency: string
  autoSyncExchangeRates: boolean
  exchangeSyncInterval: number
  exchangeRateCacheTtl: number
}

class SystemSettingsRegistry {
  private static instance: SystemSettingsRegistry
  private cache: SystemSettingsData | null = null
  private initialized = false
  private repository?: SystemRepository

  private constructor() {}

  public static getInstance(): SystemSettingsRegistry {
    if (!SystemSettingsRegistry.instance) {
      SystemSettingsRegistry.instance = new SystemSettingsRegistry()
    }
    return SystemSettingsRegistry.instance
  }

  public setRepository(repository: SystemRepository): void {
    this.repository = repository
  }

  public async load(repository?: SystemRepository): Promise<void> {
    const repo = repository || this.repository
    if (repo) {
      try {
        const settings = await repo.getSystemSettings()
        
        // Related objects are populated at depth 1, so retrieve the isoCode field safely
        const baseCurrencyCode = settings.baseCurrency && typeof settings.baseCurrency === 'object' && 'isoCode' in settings.baseCurrency
          ? (settings.baseCurrency as { isoCode: string }).isoCode
          : 'EGP'

        const defaultDisplayCurrencyCode = settings.defaultDisplayCurrency && typeof settings.defaultDisplayCurrency === 'object' && 'isoCode' in settings.defaultDisplayCurrency
          ? (settings.defaultDisplayCurrency as { isoCode: string }).isoCode
          : 'EGP'

        this.cache = {
          vatRate: settings.vatRate ?? 0,
          pricesIncludeVat: settings.pricesIncludeVat ?? false,
          vatEnabled: settings.vatEnabled ?? false,
          baseCurrency: baseCurrencyCode,
          defaultDisplayCurrency: defaultDisplayCurrencyCode,
          autoSyncExchangeRates: settings.autoSyncExchangeRates ?? true,
          exchangeSyncInterval: settings.exchangeSyncInterval ?? 60,
          exchangeRateCacheTtl: settings.exchangeRateCacheTtl ?? 15,
        }
      } catch (err: unknown) {
        console.error('[SystemSettingsRegistry] Failed loading system settings, using fallback default values:', err)
        this.cache = this.cache || {
          vatRate: 0,
          pricesIncludeVat: false,
          vatEnabled: false,
          baseCurrency: 'EGP',
          defaultDisplayCurrency: 'EGP',
          autoSyncExchangeRates: true,
          exchangeSyncInterval: 60,
          exchangeRateCacheTtl: 15,
        }
      }
    } else {
      this.cache = this.cache || {
        vatRate: 0,
        pricesIncludeVat: false,
        vatEnabled: false,
        baseCurrency: 'EGP',
        defaultDisplayCurrency: 'EGP',
        autoSyncExchangeRates: true,
        exchangeSyncInterval: 60,
        exchangeRateCacheTtl: 15,
      }
    }
    this.initialized = true
  }

  public async getSettings(repository?: SystemRepository): Promise<SystemSettingsData> {
    const repo = repository || this.repository
    if (!this.initialized || !this.cache) {
      await this.load(repo)
    }
    return this.cache!
  }

  public invalidate(): void {
    console.log('[SystemSettingsRegistry] Cache invalidated.')
    this.initialized = false
  }
}

export const systemSettingsRegistry = SystemSettingsRegistry.getInstance()
