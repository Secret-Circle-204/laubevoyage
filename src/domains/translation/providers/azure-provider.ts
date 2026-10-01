import type { ITranslationProvider } from './provider.interface'
import type { TranslationProviderId, TranslationResultWithProvenance, BatchTranslationResultWithProvenance } from '../types'
import {
  ProviderAuthError,
  ProviderQuotaExceededError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderNetworkError,
  ProviderUnavailableError,
  ProviderInvalidResponseError,
} from '../errors/provider-errors'

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
      throw new ProviderAuthError(this.providerId, 'Provider is unconfigured: missing AZURE_TRANSLATOR_KEY.')
    }

    const url = new URL(this.endpoint)
    url.searchParams.set('api-version', '3.0')
    url.searchParams.set('from', sourceLocale)
    url.searchParams.set('to', targetLocale)

    const requestBody = texts.map((t) => ({ Text: t }))

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    let response: Response
    try {
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Ocp-Apim-Subscription-Region': this.region,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if ((fetchErr as any)?.name === 'AbortError') {
        throw new ProviderTimeoutError(this.providerId, `Request timed out after ${this.timeoutMs}ms`)
      }
      throw new ProviderNetworkError(
        this.providerId,
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const rawText = await response.text().catch(() => '')
      let errorJson: any = null
      try {
        errorJson = JSON.parse(rawText)
      } catch {
        errorJson = null
      }

      const azureErrorCode =
        errorJson?.error?.code !== undefined ? Number(errorJson.error.code) : null
      const azureErrorMessage =
        errorJson?.error?.message || (rawText ? rawText.substring(0, 300) : `HTTP ${response.status}`)

      if (response.status === 403) {
        const isQuotaCode = azureErrorCode === 403001
        const isQuotaText =
          azureErrorCode === null &&
          (rawText.includes('403001') ||
            rawText.toLowerCase().includes('exceeded its quota') ||
            rawText.toLowerCase().includes('out of quota'))

        if (isQuotaCode || isQuotaText) {
          throw new ProviderQuotaExceededError(
            this.providerId,
            `HTTP 403 (Quota Exceeded - code 403001): ${azureErrorMessage}`
          )
        }
        throw new ProviderAuthError(
          this.providerId,
          `HTTP 403 (Forbidden): ${azureErrorMessage}`,
          403
        )
      }

      if (response.status === 401) {
        throw new ProviderAuthError(
          this.providerId,
          `HTTP 401 (Unauthorized): ${azureErrorMessage}`,
          401
        )
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
          `HTTP 429 (Rate Limited): ${azureErrorMessage}`,
          parsedSec
        )
      }

      throw new ProviderUnavailableError(this.providerId, response.status, azureErrorMessage)
    }

    let json: any
    try {
      json = await response.json()
    } catch (parseErr: unknown) {
      throw new ProviderInvalidResponseError(this.providerId, 'Failed to parse JSON response from Azure')
    }

    if (!Array.isArray(json) || json.length !== texts.length) {
      throw new ProviderInvalidResponseError(
        this.providerId,
        `Cardinality mismatch: expected ${texts.length} items, received ${Array.isArray(json) ? json.length : typeof json}`
      )
    }

    return json.map((item, index) => {
      const translation = item?.translations?.[0]?.text
      if (typeof translation !== 'string' || !translation.trim()) {
        return texts[index]!
      }
      return translation
    })
  }

  async translateTextWithProvenance(
    text: string,
    targetLocale: string,
    sourceLocale: string = 'en'
  ): Promise<TranslationResultWithProvenance> {
    const textRes = await this.translateText(text, targetLocale, sourceLocale)
    return { text: textRes, providerId: this.providerId }
  }

  async translateBatchWithProvenance(
    texts: string[],
    targetLocale: string,
    sourceLocale: string = 'en'
  ): Promise<BatchTranslationResultWithProvenance> {
    const textsRes = await this.translateBatch(texts, targetLocale, sourceLocale)
    return { texts: textsRes, providerId: this.providerId }
  }
}

