import type { CurrencyCode, Money } from '@/types'
import { rateRegistry } from './rate-registry'
import { catalogRegistry } from './catalog-registry'
import { CurrencyRepository } from './repository'
import { CompositeExchangeRateProvider } from './providers/composite-provider'
import type { ExchangeRateProvider } from './contracts/exchange-rate-provider'
import type { ExchangeRateSource } from './types'
import { ExchangeRateUnavailableError, EXCHANGE_RATE_SOURCES } from './types'
import { CurrencySyncPolicy } from './policy'

/**
 * Currency Domain Service
 * Single source of truth for all currency operations via CurrencyRepository & Provider Dependency Injection.
 * Base currency: EGP
 */
export class CurrencyService {
  private repository: CurrencyRepository
  private rateProvider: ExchangeRateProvider
  private static syncPromise: Promise<{ success: boolean; message: string; timestamp: string }> | null = null

  constructor(repository: CurrencyRepository, rateProvider?: ExchangeRateProvider) {
    this.repository = repository
    this.rateProvider = rateProvider || new CompositeExchangeRateProvider()
  }

  /**
   * Domain Gateway method for retrieving all active currencies from catalog registry.
   */
  async getActiveCurrencies() {
    return catalogRegistry.getAll(this.repository)
  }

  /**
   * Domain Resolution Policy: Resolves display currency against active CMS currencies catalog.
   * Relocates country-to-currency mapping to Currency Domain.
   * Business Policy:
   * 1. If candidate currency (Cookie or Session) is active in catalogRegistry -> returns it.
   * 2. If geoCountry has a mapped currency active in catalogRegistry -> returns it.
   * 3. If country/candidate currency is unsupported (e.g. JPY) -> returns 'USD' (International Tourism Benchmark).
   * 4. Fallback -> 'EGP' (Platform Base Currency).
   */
  async resolveDisplayCurrency(params?: {
    cookieCurrency?: string
    sessionCurrency?: string
    geoCountry?: string
    geoCurrencyCode?: string
  } | string): Promise<string> {
    const raw = typeof params === 'string' ? { cookieCurrency: params } : params || {}
    const activeCurrencies = await this.getActiveCurrencies()
    const supportedCodes = new Set(activeCurrencies.map((c) => c.isoCode.toUpperCase()))

    const candidate = (raw.cookieCurrency || raw.sessionCurrency || '').trim().toUpperCase()
    if (candidate && supportedCodes.has(candidate)) {
      return candidate
    }

    if (raw.geoCurrencyCode) {
      const geoCurrUpper = raw.geoCurrencyCode.trim().toUpperCase()
      if (supportedCodes.has(geoCurrUpper)) {
        return geoCurrUpper
      }
    }

    if (supportedCodes.has('USD')) {
      return 'USD'
    }

    return 'EGP'
  }

  async markAllStale(errorMessage: string, attemptTime: string) {
    const result = await this.repository.markAllStale(errorMessage, attemptTime)
    rateRegistry.invalidate()
    return result
  }

  async upsertRate(params: {
    fromCurrency: string
    toCurrency: string
    rate: number
    source: ExchangeRateSource
    syncStatus: 'synced' | 'failed' | 'stale'
    timestamp: string
  }) {
    const result = await this.repository.upsertRate(params)
    rateRegistry.invalidate()
    return result
  }

  /**
   * Helper to retrieve list of providers (flattens composite provider)
   */
  private getProviders(): ExchangeRateProvider[] {
    if ('providers' in this.rateProvider && Array.isArray((this.rateProvider as any).providers)) {
      return (this.rateProvider as any).providers
    }
    return [this.rateProvider]
  }

  async syncExchangeRates(force = false): Promise<{ success: boolean; message: string; timestamp: string; skipped?: boolean }> {
    const now = new Date()
    const nowIso = now.toISOString()
    const providers = this.getProviders()
    const orderedProviders = CurrencySyncPolicy.getOrderedProviders(providers)

    console.log(`[CurrencyService] Starting rate sync cycle (forceSync: ${force}). Providers in priority: ${orderedProviders.map(p => p.name).join(', ')}`)

    // 1. Freshness Policy check
    if (!force) {
      const latestSync = await this.repository.getLatestRateSync()
      if (latestSync) {
        const needsSync = CurrencySyncPolicy.shouldSync(latestSync.source, latestSync.lastSuccess, now)
        if (!needsSync) {
          console.log(`[CurrencyService] Sync skipped: Rates are still fresh. Last synced via ${latestSync.source} at ${latestSync.lastSuccess}.`)
          return {
            success: true,
            message: 'Sync skipped: Rates are still fresh.',
            timestamp: nowIso,
            skipped: true,
          }
        }
      }
    }

    // 2. Fetch rates with failover
    let activeProviderUsed: ExchangeRateProvider | null = null
    let fetchedRates: Record<string, number> = {}
    const skippedProviders: string[] = []
    const failedProviders: string[] = []

    for (const provider of orderedProviders) {
      // API key policy validation
      const requiresKey = CurrencySyncPolicy.requiresApiKey(provider.source)
      if (requiresKey && !provider.hasApiKey()) {
        skippedProviders.push(`${provider.name} (API key missing)`)
        continue
      }

      try {
        console.log(`[CurrencyService] Fetching rates using provider: ${provider.name}`)
        const result = await provider.fetchRates('EGP')
        if (result.rates && Object.keys(result.rates).length > 0) {
          fetchedRates = result.rates
          activeProviderUsed = provider
          break
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[CurrencyService] Provider ${provider.name} failed: ${msg}`)
        failedProviders.push(`${provider.name}: ${msg}`)
      }
    }

    // Handle skipped / all failed scenario
    if (!activeProviderUsed) {
      const errorMsg = `All rate providers failed. Skips: [${skippedProviders.join(', ')}] | Errors: [${failedProviders.join(' | ')}]`
      console.error(`[CurrencyService] ${errorMsg}`)
      try {
        await this.repository.markAllStale(errorMsg, nowIso)
        rateRegistry.invalidate()
      } catch (dbError) {
        console.error('[CurrencyService] Failed marking rates as stale:', dbError)
      }
      return {
        success: false,
        message: 'All providers failed. Kept old rates but marked as STALE.',
        timestamp: nowIso,
      }
    }

    // Save rates
    const activeCurrencies = await this.repository.findActiveCurrencies()
    const activeIsoCodes = new Set(activeCurrencies.docs.map(c => c.isoCode.toUpperCase()))

    let updated = 0
    for (const [currency, rate] of Object.entries(fetchedRates)) {
      if (!rate) continue
      const currencyUpper = currency.toUpperCase()
      if (!activeIsoCodes.has(currencyUpper)) continue

      await this.repository.upsertRate({
        fromCurrency: 'EGP',
        toCurrency: currencyUpper,
        rate,
        source: activeProviderUsed.source,
        syncStatus: 'synced',
        timestamp: nowIso,
      })
      updated++
    }

    rateRegistry.invalidate()
    console.log(`[CurrencyService] Sync completed successfully. Updated ${updated} exchange rates via ${activeProviderUsed.name}.`)
    return {
      success: true,
      message: `Updated ${updated} exchange rates via ${activeProviderUsed.name}`,
      timestamp: nowIso,
    }
  }

  /**
   * Convert amount from one currency to another using the Rate Registry
   */
  async convert(from: CurrencyCode, to: CurrencyCode, amount: number): Promise<number> {
    if (from === to) return amount

    const rate = await this.getRate(from, to)
    return amount * rate
  }

  /**
   * Run syncExchangeRates with a single-flight mutex and a 10s timeout to prevent API spamming
   */
  async syncExchangeRatesSingleFlight(): Promise<{ success: boolean; message: string; timestamp: string }> {
    if (CurrencyService.syncPromise) {
      console.log('[CurrencySync] Existing sync detected. Awaiting...')
      return CurrencyService.syncPromise
    }

    console.log('[CurrencySync] Starting auto-sync...')

    let timeoutId: NodeJS.Timeout
    const timeoutPromise = new Promise<{ success: boolean; message: string; timestamp: string }>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Sync timed out after 10000ms')), 10000)
    })

    CurrencyService.syncPromise = Promise.race([
      this.syncExchangeRates(),
      timeoutPromise
    ]).finally(() => {
      clearTimeout(timeoutId)
      CurrencyService.syncPromise = null
    })

    try {
      const result = await CurrencyService.syncPromise
      console.log('[CurrencySync] Auto-sync completed.')
      return result
    } catch (err: unknown) {
      console.error('[CurrencySync] Auto-sync failed:', err)
      throw err
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  async getRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
    if (from !== 'EGP') {
      throw new Error('Base currency must be EGP')
    }

    let rateData = await rateRegistry.getRate(to, this.repository)
    if (!rateData) {
      console.warn(`[CurrencyService] Exchange rate for ${to} not found. Triggering auto-sync...`)
      try {
        await this.syncExchangeRatesSingleFlight()
      } catch (err: unknown) {
        console.error('[CurrencyService] Auto-sync failed during rate lookup:', err)
      }
      rateData = await rateRegistry.getRate(to, this.repository)
    }

    if (!rateData) {
      console.error(
        `[CurrencyService] Conversion failed: Exchange rate from ${from} to ${to} is completely missing in database and cache after sync attempt. ` +
        `Timestamp: ${new Date().toISOString()}`
      )
      throw new ExchangeRateUnavailableError(from, to, 'Rate missing in database and cache')
    }

    return rateData.rate
  }

  /**
   * Convert Money object to another currency
   */
  async convertMoney(money: Money, toCurrency: CurrencyCode): Promise<Money> {
    const convertedAmount = await this.convert(money.currency, toCurrency, money.amount)
    return {
      amount: convertedAmount,
      currency: toCurrency,
    }
  }

  /**
   * Convert points to currency value
   * 1 point = 0.5 EGP base value
   */
  async pointsToCurrency(points: number, currency: CurrencyCode): Promise<number> {
    const egpValue = points * 0.5
    return this.convert('EGP', currency, egpValue)
  }

  /**
   * Format money for display
   */
  formatMoney(money: Money, locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
    }).format(money.amount)
  }

  /**
   * Capture an immutable exchange rate snapshot for booking creation
   */
  async getExchangeRateSnapshot(targetCurrency: string): Promise<{ rate: number; timestamp: string }> {
    if (targetCurrency === 'EGP') {
      return { rate: 1, timestamp: new Date().toISOString() }
    }
    try {
      const rate = await this.getRate('EGP', targetCurrency as CurrencyCode)
      return { rate, timestamp: new Date().toISOString() }
    } catch {
      // If missing from cache, trigger live rate sync immediately
      await this.syncExchangeRates()
      const rate = await this.getRate('EGP', targetCurrency as CurrencyCode)
      return { rate, timestamp: new Date().toISOString() }
    }
  }

  /**
   * Background rate refresh for cron dispatcher
   */
  async refreshRateCatalog(): Promise<{ success: boolean; message: string }> {
    return this.syncExchangeRates()
  }
}
