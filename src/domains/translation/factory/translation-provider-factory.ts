import type { ITranslationProvider } from '../providers/provider.interface'
import { GoogleTranslationProvider } from '../providers/google-provider'
import { LibreTranslationProvider } from '../providers/libre-provider'

export class TranslationProviderFactory {
  private static providers: Map<string, ITranslationProvider> = new Map<string, ITranslationProvider>([
    ['google', new GoogleTranslationProvider()],
    ['libre', new LibreTranslationProvider()],
  ])

  static getProvider(providerId?: string): ITranslationProvider {
    const key = (providerId || 'google').toLowerCase()
    const provider = this.providers.get(key)
    if (!provider) {
      return this.providers.get('google')!
    }
    return provider
  }

  static registerProvider(provider: ITranslationProvider): void {
    this.providers.set(provider.providerId.toLowerCase(), provider)
  }
}
