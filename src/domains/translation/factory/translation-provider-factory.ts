import type { TranslationProvider } from '../contracts/translation-provider'
import { GoogleTranslationProvider } from '../providers/google-provider'
import { LibreTranslationProvider } from '../providers/libre-provider'

export class TranslationProviderFactory {
  private static providers: Map<string, TranslationProvider> = new Map([
    ['google', new GoogleTranslationProvider()],
    ['libre', new LibreTranslationProvider()],
  ])

  static getProvider(providerId?: string): TranslationProvider {
    const key = (providerId || 'google').toLowerCase()
    const provider = this.providers.get(key)
    if (!provider) {
      return this.providers.get('google')!
    }
    return provider
  }

  static registerProvider(provider: TranslationProvider): void {
    this.providers.set(provider.providerId.toLowerCase(), provider)
  }
}
