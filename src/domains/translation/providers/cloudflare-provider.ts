import type { ITranslationProvider } from './provider.interface'
import type { TranslationProviderId, TranslationResultWithProvenance, BatchTranslationResultWithProvenance } from '../types'
import {
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderNetworkError,
  ProviderUnavailableError,
  ProviderInvalidResponseError,
} from '../errors/provider-errors'

const CLOUDFLARE_LANGUAGE_MAP: Record<string, string> = {
  en: 'english',
  ar: 'arabic',
  fr: 'french',
  de: 'german',
  it: 'italian',
  ru: 'russian',
  es: 'spanish',
  zh: 'chinese',
  ja: 'japanese',
}

export class CloudflareTranslatorProvider implements ITranslationProvider {
  readonly providerId: TranslationProviderId = 'cloudflare'
  private readonly accountId: string
  private readonly apiToken: string
  private readonly model: string
  private readonly maxConcurrency: number
  private readonly timeoutMs: number

  constructor(options?: {
    accountId?: string
    apiToken?: string
    model?: string
    timeoutMs?: number
    maxConcurrency?: number
  }) {
    this.accountId = options?.accountId ?? (process.env.CLOUDFLARE_ACCOUNT_ID || '')
    this.apiToken = options?.apiToken ?? (process.env.CLOUDFLARE_API_TOKEN || '')
    this.model = options?.model ?? '@cf/meta/m2m100-1.2b'
    this.timeoutMs = Math.min(Math.max(options?.timeoutMs ?? 5000, 500), 10000)

    const envVal = process.env.CLOUDFLARE_MAX_CONCURRENCY
    const rawConcurrency =
      options?.maxConcurrency ?? (envVal !== undefined && envVal.trim() !== '' ? Number(envVal) : 5)
    const normalized =
      typeof rawConcurrency === 'number' && Number.isFinite(rawConcurrency)
        ? Math.floor(rawConcurrency)
        : 5
    this.maxConcurrency = Math.min(Math.max(normalized, 1), 10)
  }

  isConfigured(): boolean {
    return Boolean(this.accountId && this.accountId.trim() && this.apiToken && this.apiToken.trim())
  }

  private normalizeLanguage(locale: string): string {
    const clean = locale.toLowerCase().split('-')[0] || locale.toLowerCase()
    return CLOUDFLARE_LANGUAGE_MAP[clean] || clean
  }

  async translateText(text: string, targetLocale: string, sourceLocale: string = 'en'): Promise<string> {
    if (!text || !text.trim() || targetLocale === sourceLocale) {
      return text
    }

    if (!this.isConfigured()) {
      throw new ProviderAuthError(
        this.providerId,
        'Provider is unconfigured: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.'
      )
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`
    const source_lang = this.normalizeLanguage(sourceLocale)
    const target_lang = this.normalizeLanguage(targetLocale)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          source_lang,
          target_lang,
        }),
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
      const errorText = await response.text().catch(() => '')
      if (response.status === 401 || response.status === 403) {
        throw new ProviderAuthError(
          this.providerId,
          `HTTP ${response.status}: ${errorText.substring(0, 300)}`,
          response.status as 401 | 403
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
          `HTTP 429: ${errorText.substring(0, 300)}`,
          parsedSec
        )
      }
      throw new ProviderUnavailableError(this.providerId, response.status, errorText.substring(0, 300))
    }

    let json: any
    try {
      json = await response.json()
    } catch (parseErr: unknown) {
      throw new ProviderInvalidResponseError(this.providerId, 'Failed to parse JSON response from Cloudflare')
    }

    if (!json || json.success === false) {
      const msg = json?.errors?.[0]?.message || 'Workers AI returned unsuccessful status'
      throw new ProviderUnavailableError(this.providerId, 502, msg)
    }

    const translated = json?.result?.translated_text
    if (typeof translated !== 'string' || !translated.trim()) {
      return text
    }

    return translated
  }


  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    return this.translateText(translationKey, targetLocale, 'en')
  }

  async translateBatch(texts: string[], targetLocale: string, sourceLocale: string = 'en'): Promise<string[]> {
    if (!texts || texts.length === 0) return []
    if (targetLocale === sourceLocale) return texts

    const results: string[] = new Array(texts.length)
    let nextIndex = 0
    let firstError: unknown = null

    const worker = async (): Promise<void> => {
      while (nextIndex < texts.length && !firstError) {
        const index = nextIndex++
        try {
          results[index] = await this.translateText(texts[index]!, targetLocale, sourceLocale)
        } catch (err: unknown) {
          if (!firstError) {
            firstError = err
          }
          break
        }
      }
    }

    const workerCount = Math.min(this.maxConcurrency, texts.length)
    const workers: Promise<void>[] = []
    for (let i = 0; i < workerCount; i++) {
      workers.push(worker())
    }

    await Promise.all(workers)

    if (firstError) {
      throw firstError
    }

    return results
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
