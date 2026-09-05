import type { SystemRepository } from './repository'

export interface SenderIdentityConfig {
  fromName: string
  fromEmail: string
  replyTo: string
}

export interface EmailSenderSettingsData {
  reservationIdentity: SenderIdentityConfig
  loyaltyIdentity: SenderIdentityConfig
  securityIdentity?: SenderIdentityConfig
}

export interface SystemSettingsData {
  vatRate: number
  pricesIncludeVat: boolean
  vatEnabled: boolean
  baseCurrency: string
  defaultDisplayCurrency: string
  autoSyncExchangeRates: boolean
  exchangeSyncInterval: number
  exchangeRateCacheTtl: number
  emailSenderSettings: EmailSenderSettingsData
}

const SYSTEM_SETTINGS_GLOBAL_KEY = Symbol.for('laube.system.settings.registry.instance')

export class SystemSettingsRegistry {
  private cache: SystemSettingsData | null = null
  private initialized = false
  private repository?: SystemRepository

  private constructor() {}

  public static getInstance(): SystemSettingsRegistry {
    const globalContext = globalThis as unknown as Record<typeof SYSTEM_SETTINGS_GLOBAL_KEY, SystemSettingsRegistry>
    if (!globalContext[SYSTEM_SETTINGS_GLOBAL_KEY]) {
      globalContext[SYSTEM_SETTINGS_GLOBAL_KEY] = new SystemSettingsRegistry()
    }
    return globalContext[SYSTEM_SETTINGS_GLOBAL_KEY]
  }

  public setRepository(repository: SystemRepository): void {
    this.repository = repository
  }

  public async load(repository?: SystemRepository): Promise<void> {
    const repo = repository || this.repository
    if (!repo) {
      throw new Error('[SystemSettingsRegistry] SystemRepository is not initialized.')
    }

    const settings = await repo.getSystemSettings()
    if (!settings) {
      throw new Error('[SystemSettingsRegistry] SystemSettings global document not found.')
    }

    // 1. Validate Reservation Sender Identity (Fail-Fast, zero fallbacks)
    const resSender = settings.emailSenderSettings?.reservationIdentity
    if (!resSender?.fromName || !resSender?.fromEmail || !resSender?.replyTo) {
      throw new Error(
        '[SystemSettingsRegistry] Missing required Reservation sender configuration in SystemSettings. (fromName, fromEmail, and replyTo are required)',
      )
    }

    // 2. Validate Loyalty Sender Identity (Fail-Fast, zero fallbacks)
    const loySender = settings.emailSenderSettings?.loyaltyIdentity
    if (!loySender?.fromName || !loySender?.fromEmail || !loySender?.replyTo) {
      throw new Error(
        '[SystemSettingsRegistry] Missing required Loyalty sender configuration in SystemSettings. (fromName, fromEmail, and replyTo are required)',
      )
    }

    // 3. Parse Security Sender Identity (Optional / TBD until configured)
    const secSender = settings.emailSenderSettings?.securityIdentity
    let securityIdentity: SenderIdentityConfig | undefined = undefined
    if (secSender?.fromName && secSender?.fromEmail && secSender?.replyTo) {
      securityIdentity = {
        fromName: secSender.fromName,
        fromEmail: secSender.fromEmail,
        replyTo: secSender.replyTo,
      }
    }

    // Related objects are populated at depth 1, so retrieve the isoCode field safely
    const baseCurrencyCode =
      settings.baseCurrency &&
      typeof settings.baseCurrency === 'object' &&
      'isoCode' in settings.baseCurrency
        ? (settings.baseCurrency as { isoCode: string }).isoCode
        : 'EGP'

    const defaultDisplayCurrencyCode =
      settings.defaultDisplayCurrency &&
      typeof settings.defaultDisplayCurrency === 'object' &&
      'isoCode' in settings.defaultDisplayCurrency
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
      emailSenderSettings: {
        reservationIdentity: {
          fromName: resSender.fromName,
          fromEmail: resSender.fromEmail,
          replyTo: resSender.replyTo,
        },
        loyaltyIdentity: {
          fromName: loySender.fromName,
          fromEmail: loySender.fromEmail,
          replyTo: loySender.replyTo,
        },
        securityIdentity,
      },
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
    this.cache = null
  }
}

export const systemSettingsRegistry = SystemSettingsRegistry.getInstance()

