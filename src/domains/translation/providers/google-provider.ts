import type { ITranslationProvider } from './provider.interface'
import type { TranslationProviderId, TranslationResultWithProvenance, BatchTranslationResultWithProvenance } from '../types'
import {
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderNetworkError,
  ProviderUnavailableError,
  ProviderInvalidResponseError,
  ProviderTransportLimitError,
} from '../errors/provider-errors'

export class GoogleTranslationProvider implements ITranslationProvider {
  readonly providerId: TranslationProviderId = 'google'
  private readonly timeoutMs: number
  private readonly maxChunkItems: number = 10
  private readonly maxSafeUrlLength: number = 1800 // Conservative safety limit well below standard 2048 HTTP GET limit
  private readonly delimiter: string = ' ||| '

  constructor(timeoutMs?: number) {
    const envTimeout = Number(process.env.TRANSLATION_TIMEOUT_MS)
    const rawTimeout = timeoutMs || (!isNaN(envTimeout) && envTimeout > 0 ? envTimeout : 3500)
    this.timeoutMs = Math.min(Math.max(rawTimeout, 500), 10000)
  }

  isConfigured(): boolean {
    return process.env.ENABLE_GOOGLE_GTX === 'true'
  }

  private buildUrl(text: string, targetLocale: string, sourceLocale: string): string {
    return `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLocale}&tl=${targetLocale}&dt=t&q=${encodeURIComponent(text)}`
  }

  async translateText(text: string, targetLocale: string, sourceLocale = 'en'): Promise<string> {
    if (!text || targetLocale === sourceLocale) return text

    const url = this.buildUrl(text, targetLocale, sourceLocale)
    if (url.length > this.maxSafeUrlLength) {
      throw new ProviderTransportLimitError(
        this.providerId,
        `Single text exceeds maximum safe URL transport limit (${url.length} > ${this.maxSafeUrlLength})`
      )
    }

    let response: Response
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (fetchErr: unknown) {
      if ((fetchErr as any)?.name === 'TimeoutError' || (fetchErr as any)?.name === 'AbortError') {
        throw new ProviderTimeoutError(this.providerId, `Request timed out after ${this.timeoutMs}ms`)
      }
      throw new ProviderNetworkError(
        this.providerId,
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      )
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      if (response.status === 401 || response.status === 403) {
        throw new ProviderAuthError(this.providerId, `HTTP ${response.status}: ${errorText.substring(0, 300)}`)
      }
      if (response.status === 429) {
        const retryHeader = response.headers.get('retry-after')
        let parsedSec: number | undefined
        if (retryHeader) {
          const s = parseInt(retryHeader, 10)
          if (!isNaN(s) && s > 0) parsedSec = Math.min(s, 300)
        }
        throw new ProviderRateLimitError(
          this.providerId,
          `HTTP 429: ${errorText.substring(0, 300)}`,
          parsedSec
        )
      }
      throw new ProviderUnavailableError(this.providerId, response.status, errorText.substring(0, 300))
    }

    let data: any
    try {
      data = await response.json()
    } catch (parseErr: unknown) {
      throw new ProviderInvalidResponseError(this.providerId, 'Failed to parse JSON response from Google')
    }

    // Google Translate GTX structure: [[[translatedText, sourceText, ...]]]
    if (data && Array.isArray(data[0])) {
      const translatedSegments = data[0]
        .filter((item: unknown): item is Array<string> => Array.isArray(item) && typeof item[0] === 'string')
        .map((item: Array<string>) => item[0])
        .join('')

      if (translatedSegments) return translatedSegments
    }

    throw new ProviderInvalidResponseError(this.providerId, 'Malformed or empty response payload from API')
  }

  private async translateChunk(texts: string[], targetLocale: string, sourceLocale = 'en'): Promise<string[]> {
    if (!texts || texts.length === 0) return []
    if (targetLocale === sourceLocale) return texts

    const combinedText = texts.join(this.delimiter)

    const translatedCombined = await this.translateText(combinedText, targetLocale, sourceLocale)
    const translatedParts = translatedCombined.split(/\s*\|\|\|\s*/)

    if (translatedParts.length !== texts.length) {
      throw new ProviderInvalidResponseError(
        this.providerId,
        `Batch delimiter split mismatch: expected ${texts.length}, got ${translatedParts.length}`
      )
    }

    return translatedParts.map((t) => t.trim())
  }


  private buildSafeChunks(texts: string[], targetLocale: string, sourceLocale: string): string[][] {
    const chunks: string[][] = []
    let currentChunk: string[] = []

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]

      // 1. Guard against individual oversized texts
      const singleUrl = this.buildUrl(text, targetLocale, sourceLocale)
      if (singleUrl.length > this.maxSafeUrlLength) {
        throw new Error(
          `[GoogleTranslationProvider] Single text at index ${i} exceeds maximum safe URL transport limit (${singleUrl.length} > ${this.maxSafeUrlLength})`
        )
      }

      if (currentChunk.length === 0) {
        currentChunk.push(text)
        continue
      }

      // Check item count boundary
      if (currentChunk.length >= this.maxChunkItems) {
        chunks.push(currentChunk)
        currentChunk = [text]
        continue
      }

      // Check actual encoded URL boundary of combined chunk
      const candidateCombined = [...currentChunk, text].join(this.delimiter)
      const candidateUrl = this.buildUrl(candidateCombined, targetLocale, sourceLocale)

      if (candidateUrl.length <= this.maxSafeUrlLength) {
        currentChunk.push(text)
      } else {
        chunks.push(currentChunk)
        currentChunk = [text]
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  async translateBatch(texts: string[], targetLocale: string, sourceLocale = 'en'): Promise<string[]> {
    if (!texts || texts.length === 0) return []
    if (targetLocale === sourceLocale) return texts

    // Build transport chunks bounded by BOTH item count and actual encoded URL length
    const chunks = this.buildSafeChunks(texts, targetLocale, sourceLocale)

    // All-or-Nothing execution across chunks: if any chunk fails, the entire batch throws immediately
    const results: string[] = []
    for (const chunk of chunks) {
      const translatedChunk = await this.translateChunk(chunk, targetLocale, sourceLocale)
      results.push(...translatedChunk)
    }

    return results
  }

  async translateKey(key: string, locale: string): Promise<string> {
    return this.translateText(key, locale)
  }

  async translateTextWithProvenance(
    text: string,
    targetLocale: string,
    sourceLocale = 'en'
  ): Promise<TranslationResultWithProvenance> {
    const textRes = await this.translateText(text, targetLocale, sourceLocale)
    return { text: textRes, providerId: this.providerId }
  }

  async translateBatchWithProvenance(
    texts: string[],
    targetLocale: string,
    sourceLocale = 'en'
  ): Promise<BatchTranslationResultWithProvenance> {
    const textsRes = await this.translateBatch(texts, targetLocale, sourceLocale)
    return { texts: textsRes, providerId: this.providerId }
  }
}

export { GoogleTranslationProvider as GoogleTranslateProvider }


