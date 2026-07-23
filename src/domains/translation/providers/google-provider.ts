import type { TranslationProvider } from '../contracts/translation-provider'

export class GoogleTranslationProvider implements TranslationProvider {
  readonly providerId = 'google'

  async translateText(text: string, targetLocale: string, sourceLocale = 'en'): Promise<string> {
    if (!text || targetLocale === sourceLocale) return text

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLocale}&tl=${targetLocale}&dt=t&q=${encodeURIComponent(text)}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`[GoogleTranslationProvider] API returned status ${response.status}`)
      }

      const data = await response.json()

      // Google Translate GTX structure: [[[translatedText, sourceText, ...]]]
      if (data && Array.isArray(data[0])) {
        const translatedSegments = data[0]
          .filter((item: unknown): item is Array<string> => Array.isArray(item) && typeof item[0] === 'string')
          .map((item: Array<string>) => item[0])
          .join('')

        if (translatedSegments) return translatedSegments
      }

      return text
    } catch (error: unknown) {
      console.error('[GoogleTranslationProvider] Error translating text:', error)
      return text
    }
  }

  async translateBatch(texts: string[], targetLocale: string, sourceLocale = 'en'): Promise<string[]> {
    return Promise.all(texts.map((t) => this.translateText(t, targetLocale, sourceLocale)))
  }

  async translateKey(key: string, locale: string): Promise<string> {
    return this.translateText(key, locale)
  }
}

export { GoogleTranslationProvider as GoogleTranslateProvider }

