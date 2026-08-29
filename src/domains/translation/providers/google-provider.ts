import type { ITranslationProvider } from './provider.interface'
import type { TranslationProviderId } from '../types'

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
      throw new Error(
        `[GoogleTranslationProvider] Single text exceeds maximum safe URL transport limit (${url.length} > ${this.maxSafeUrlLength})`
      )
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
      })

      if (!response.ok) {
        const error = new Error(`[GoogleTranslationProvider] API returned status ${response.status}`)
        ;(error as any).status = response.status
        ;(error as any).retryAfter = response.headers.get('retry-after')
        throw error
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

      throw new Error('[GoogleTranslationProvider] Malformed or empty response payload from API')
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          const timeoutErr = new Error(`[GoogleTranslationProvider] Request timed out after ${this.timeoutMs}ms`)
          ;(timeoutErr as any).name = 'TimeoutError'
          throw timeoutErr
        }
        throw error
      }
      throw new Error(String(error))
    }
  }

  private async translateChunk(texts: string[], targetLocale: string, sourceLocale = 'en'): Promise<string[]> {
    if (!texts || texts.length === 0) return []
    if (targetLocale === sourceLocale) return texts

    const combinedText = texts.join(this.delimiter)

    const translatedCombined = await this.translateText(combinedText, targetLocale, sourceLocale)
    const translatedParts = translatedCombined.split(/\s*\|\|\|\s*/)

    if (translatedParts.length !== texts.length) {
      throw new Error(
        `[GoogleTranslationProvider] Batch delimiter split mismatch: expected ${texts.length}, got ${translatedParts.length}`
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
}

export { GoogleTranslationProvider as GoogleTranslateProvider }


