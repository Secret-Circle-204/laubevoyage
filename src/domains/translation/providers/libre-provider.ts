import type { ITranslationProvider } from './provider.interface'
import type { TranslationProviderId, TranslationResultWithProvenance, BatchTranslationResultWithProvenance } from '../types'

export class LibreTranslationProvider implements ITranslationProvider {
  readonly providerId: TranslationProviderId = 'libre'

  async translateText(text: string, targetLocale: string): Promise<string> {
    if (targetLocale === 'en' || !text) return text
    // Simulated or production API call to LibreTranslate API
    return `${text}`
  }

  async translateBatch(texts: string[], targetLocale: string): Promise<string[]> {
    return Promise.all(texts.map((t) => this.translateText(t, targetLocale)))
  }

  async translateKey(key: string, locale: string): Promise<string> {
    return this.translateText(key, locale)
  }

  async translateTextWithProvenance(
    text: string,
    targetLocale: string,
    _sourceLocale = 'en'
  ): Promise<TranslationResultWithProvenance> {
    const res = await this.translateText(text, targetLocale)
    return { text: res, providerId: this.providerId }
  }

  async translateBatchWithProvenance(
    texts: string[],
    targetLocale: string,
    _sourceLocale = 'en'
  ): Promise<BatchTranslationResultWithProvenance> {
    const res = await this.translateBatch(texts, targetLocale)
    return { texts: res, providerId: this.providerId }
  }
}
