import type { TranslationProvider } from './types'

/**
 * LibreTranslate Provider (Self-hosted or public endpoint)
 * Infrastructure layer — no business logic.
 */
export class LibreTranslateProvider implements TranslationProvider {
  readonly name = 'libre'
  private endpoint: string

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.LIBRE_TRANSLATE_URL || 'https://libretranslate.com/translate'
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: from,
        target: to,
        format: 'text',
      }),
    })

    if (!response.ok) {
      throw new Error(`[LibreTranslateProvider] API returned status ${response.status}`)
    }

    const data = await response.json()

    if (data && data.translatedText) {
      return data.translatedText
    }

    throw new Error('[LibreTranslateProvider] Unexpected response structure')
  }
}
