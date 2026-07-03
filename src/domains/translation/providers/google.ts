import type { TranslationProvider } from './types'

/**
 * Google Translate Provider (Free GTX endpoint)
 * Infrastructure layer — no business logic.
 */
export class GoogleTranslateProvider implements TranslationProvider {
  readonly name = 'google'

  async translate(text: string, from: string, to: string): Promise<string> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`[GoogleTranslateProvider] API returned status ${response.status}`)
    }

    const data = await response.json()

    // Google Translate response structure: [[[translatedText, sourceText, ...]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0]
    }

    throw new Error('[GoogleTranslateProvider] Unexpected response structure')
  }
}
