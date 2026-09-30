import type { ITranslationProvider } from './provider.interface'
import type { TranslationProviderId, TranslationResultWithProvenance, BatchTranslationResultWithProvenance } from '../types'

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

export class GoogleCloudTranslationProvider implements ITranslationProvider {
  readonly providerId: TranslationProviderId = 'google-cloud'
  private readonly apiKey: string
  private readonly endpoint: string
  private readonly timeoutMs: number

  constructor(options?: { apiKey?: string; endpoint?: string; timeoutMs?: number }) {
    this.apiKey = options?.apiKey ?? (process.env.GOOGLE_TRANSLATE_API_KEY || '')
    this.endpoint =
      options?.endpoint ??
      (process.env.GOOGLE_TRANSLATE_ENDPOINT || 'https://translation.googleapis.com/language/translate/v2')
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
      const err = new Error(
        '[GoogleCloudTranslationProvider] Provider is unconfigured: missing GOOGLE_TRANSLATE_API_KEY.'
      )
      ;(err as any).status = 401
      throw err
    }

    const url = new URL(this.endpoint)
    url.searchParams.set('key', this.apiKey)

    const requestBody = {
      q: texts,
      source: sourceLocale,
      target: targetLocale,
      format: 'text',
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        const err = new Error(
          `[GoogleCloudTranslationProvider] HTTP ${response.status} ${response.statusText}: ${errorText.substring(
            0,
            300
          )}`
        )
        ;(err as any).status = response.status
        const retryAfter = response.headers.get('retry-after')
        if (retryAfter) {
          ;(err as any).retryAfter = retryAfter
        }
        throw err
      }

      const json = await response.json()
      const translations = json?.data?.translations
      if (!Array.isArray(translations) || translations.length !== texts.length) {
        throw new Error(
          `[GoogleCloudTranslationProvider] Cardinality mismatch: expected ${texts.length} items, received ${
            Array.isArray(translations) ? translations.length : 0
          }`
        )
      }

      return translations.map((item, index) => {
        const rawText = item?.translatedText
        if (typeof rawText !== 'string' || !rawText.trim()) {
          return texts[index]!
        }
        return decodeHtmlEntities(rawText)
      })
    } catch (err: unknown) {
      if ((err as any)?.name === 'AbortError') {
        const timeoutErr = new Error(`[GoogleCloudTranslationProvider] Request timed out after ${this.timeoutMs}ms`)
        ;(timeoutErr as any).status = 504
        throw timeoutErr
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async translateTextWithProvenance(
    text: string,
    targetLocale: string,
    sourceLocale: string = 'en'
  ): Promise<TranslationResultWithProvenance> {
    const res = await this.translateText(text, targetLocale, sourceLocale)
    return { text: res, providerId: this.providerId }
  }

  async translateBatchWithProvenance(
    texts: string[],
    targetLocale: string,
    sourceLocale: string = 'en'
  ): Promise<BatchTranslationResultWithProvenance> {
    const res = await this.translateBatch(texts, targetLocale, sourceLocale)
    return { texts: res, providerId: this.providerId }
  }
}
