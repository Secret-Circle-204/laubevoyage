import type { ITranslationProvider } from './provider.interface'
import type { TranslationProviderId } from '../types'

export class AzureTranslatorProvider implements ITranslationProvider {
  readonly providerId: TranslationProviderId = 'azure'
  private readonly apiKey: string
  private readonly region: string
  private readonly endpoint: string
  private readonly timeoutMs: number

  constructor(options?: { apiKey?: string; region?: string; endpoint?: string; timeoutMs?: number }) {
    this.apiKey = options?.apiKey ?? (process.env.AZURE_TRANSLATOR_KEY || '')
    this.region = options?.region ?? (process.env.AZURE_TRANSLATOR_REGION || 'global')
    this.endpoint =
      options?.endpoint ??
      (process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com/translate')
    this.timeoutMs = Math.min(Math.max(options?.timeoutMs ?? 4000, 500), 10000)
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0)
  }

  async translateText(text: string, targetLocale: string, sourceLocale: string = 'en'): Promise<string> {
    if (!text || !text.trim() || targetLocale === sourceLocale) {
      return text
    }

    const batchResult = await this.translateBatch([text], targetLocale, sourceLocale)
    return batchResult[0] || text
  }

  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    return this.translateText(translationKey, targetLocale, 'en')
  }

  async translateBatch(texts: string[], targetLocale: string, sourceLocale: string = 'en'): Promise<string[]> {
    if (!texts || texts.length === 0) return []
    if (targetLocale === sourceLocale) return texts

    if (!this.isConfigured()) {
      const err = new Error('[AzureTranslatorProvider] Provider is unconfigured: missing AZURE_TRANSLATOR_KEY.')
      ;(err as any).status = 401
      throw err
    }

    const url = new URL(this.endpoint)
    url.searchParams.set('api-version', '3.0')
    url.searchParams.set('from', sourceLocale)
    url.searchParams.set('to', targetLocale)

    const requestBody = texts.map((t) => ({ Text: t }))

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Ocp-Apim-Subscription-Region': this.region,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        const err = new Error(
          `[AzureTranslatorProvider] HTTP ${response.status} ${response.statusText}: ${errorText.substring(0, 300)}`
        )
        ;(err as any).status = response.status
        const retryAfter = response.headers.get('retry-after')
        if (retryAfter) {
          ;(err as any).retryAfter = retryAfter
        }
        throw err
      }

      const json = await response.json()
      if (!Array.isArray(json) || json.length !== texts.length) {
        throw new Error(
          `[AzureTranslatorProvider] Cardinality mismatch: expected ${texts.length} items, received ${
            Array.isArray(json) ? json.length : 0
          }`
        )
      }

      return json.map((item, index) => {
        const translation = item?.translations?.[0]?.text
        if (typeof translation !== 'string' || !translation.trim()) {
          return texts[index]!
        }
        return translation
      })
    } catch (err: unknown) {
      if ((err as any)?.name === 'AbortError') {
        const timeoutErr = new Error(`[AzureTranslatorProvider] Request timed out after ${this.timeoutMs}ms`)
        ;(timeoutErr as any).status = 504
        throw timeoutErr
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
