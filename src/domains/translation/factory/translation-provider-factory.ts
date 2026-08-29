import type { ITranslationProvider } from '../providers/provider.interface'
import { GoogleTranslationProvider } from '../providers/google-provider'
import { LibreTranslationProvider } from '../providers/libre-provider'
import { AzureTranslatorProvider } from '../providers/azure-provider'
import { CloudflareTranslatorProvider } from '../providers/cloudflare-provider'
import { GoogleCloudTranslationProvider } from '../providers/google-cloud-provider'
import { TranslationProviderPool } from '../pool/translation-provider-pool'

export class TranslationProviderFactory {
  private static poolInstance: TranslationProviderPool | null = null
  private static providers: Map<string, ITranslationProvider> = new Map<string, ITranslationProvider>()

  private static initialize(): void {
    if (this.providers.size > 0) return

    const azure = new AzureTranslatorProvider()
    const cloudflare = new CloudflareTranslatorProvider()
    const googleCloud = new GoogleCloudTranslationProvider()
    const legacyGoogle = new GoogleTranslationProvider()
    const legacyLibre = new LibreTranslationProvider()

    this.providers.set('azure', azure)
    this.providers.set('cloudflare', cloudflare)
    this.providers.set('google-cloud', googleCloud)
    this.providers.set('google', legacyGoogle)
    this.providers.set('libre', legacyLibre)

    // Strict Priority Chain: Azure (Primary) -> Google GTX (Opt-in Secondary) -> Cloudflare (Tertiary Fallback)
    this.poolInstance = new TranslationProviderPool([azure, legacyGoogle, cloudflare])
  }

  static getProvider(providerId?: string): ITranslationProvider {
    this.initialize()

    if (!providerId || providerId.toLowerCase() === 'pool') {
      return this.poolInstance!
    }

    const key = providerId.toLowerCase()
    const provider = this.providers.get(key)
    if (!provider) {
      return this.poolInstance!
    }
    return provider
  }

  static getPool(): TranslationProviderPool {
    this.initialize()
    return this.poolInstance!
  }

  static registerProvider(provider: ITranslationProvider): void {
    this.initialize()
    this.providers.set(provider.providerId.toLowerCase(), provider)
  }

  static resetForTest(): void {
    this.poolInstance = null
    this.providers.clear()
  }
}

