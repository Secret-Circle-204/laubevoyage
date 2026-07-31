import { EXCHANGE_RATE_SOURCES, type ExchangeRateSource } from './types'
import type { ExchangeRateProvider } from './contracts/exchange-rate-provider'
import { DomainException } from '../shared/exceptions/domain-exception'

export class CurrencyConfigurationException extends DomainException {
  constructor(message: string) {
    super(message, 'CURRENCY_CONFIGURATION_ERROR', 500)
    this.name = 'CurrencyConfigurationException'
  }
}

export interface ProviderSyncPolicy {
  readonly refreshIntervalSeconds: number
  readonly requiresApiKey: boolean
  readonly priority: number
}

export const CURRENCY_SYNC_POLICY: Record<ExchangeRateSource, ProviderSyncPolicy> = {
  [EXCHANGE_RATE_SOURCES.EXCHANGE_RATE_API]: {
    refreshIntervalSeconds: 86400, // 24 hours
    requiresApiKey: false,
    priority: 1,
  },
  [EXCHANGE_RATE_SOURCES.FAWAZ_AHMED]: {
    refreshIntervalSeconds: 86400, // 24 hours
    requiresApiKey: false,
    priority: 2,
  },
  [EXCHANGE_RATE_SOURCES.OPEN_EXCHANGE]: {
    refreshIntervalSeconds: 3600, // 1 hour
    requiresApiKey: true,
    priority: 3,
  },
  [EXCHANGE_RATE_SOURCES.MANUAL]: {
    refreshIntervalSeconds: 0,
    requiresApiKey: false,
    priority: 99,
  },
}

export class CurrencySyncPolicy {
  /**
   * Determine if the rates need to be synced based on the last successful sync metadata
   */
  public static shouldSync(
    source: ExchangeRateSource,
    lastSuccessTimestamp: string | null,
    now: Date = new Date(),
  ): boolean {
    if (!lastSuccessTimestamp) {
      return true
    }

    const policy = CURRENCY_SYNC_POLICY[source]
    if (!policy) {
      throw new CurrencyConfigurationException(`Currency sync policy is missing for source: ${source}`)
    }

    const refreshInterval = policy.refreshIntervalSeconds
    const lastSuccessTime = new Date(lastSuccessTimestamp).getTime()
    const elapsedSeconds = (now.getTime() - lastSuccessTime) / 1000

    return elapsedSeconds >= refreshInterval
  }

  /**
   * Order a list of exchange rate providers based on their configured policy priorities
   */
  public static getOrderedProviders(providers: ExchangeRateProvider[]): ExchangeRateProvider[] {
    return [...providers].sort((a, b) => {
      const policyA = CURRENCY_SYNC_POLICY[a.source]
      const policyB = CURRENCY_SYNC_POLICY[b.source]

      if (!policyA) {
        throw new CurrencyConfigurationException(`Currency sync policy is missing for source: ${a.source}`)
      }
      if (!policyB) {
        throw new CurrencyConfigurationException(`Currency sync policy is missing for source: ${b.source}`)
      }

      return policyA.priority - policyB.priority
    })
  }

  /**
   * Check if a provider requires an API key according to the policy
   */
  public static requiresApiKey(source: ExchangeRateSource): boolean {
    const policy = CURRENCY_SYNC_POLICY[source]
    if (!policy) {
      throw new CurrencyConfigurationException(`Currency sync policy is missing for source: ${source}`)
    }
    return policy.requiresApiKey
  }
}
