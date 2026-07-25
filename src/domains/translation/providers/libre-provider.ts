import type { ITranslationProvider } from './provider.interface'

export class LibreTranslationProvider implements ITranslationProvider {
  readonly providerId = 'libre'

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
}
