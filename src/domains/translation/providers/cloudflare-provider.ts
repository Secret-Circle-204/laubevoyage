import type { ITranslationProvider } from './provider.interface'
import type { TranslationProviderId } from '../types'

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
  private readonly timeoutMs: number

  constructor(options?: { accountId?: string; apiToken?: string; model?: string; timeoutMs?: number }) {
    this.accountId = options?.accountId ?? (process.env.CLOUDFLARE_ACCOUNT_ID || '')
    this.apiToken = options?.apiToken ?? (process.env.CLOUDFLARE_API_TOKEN || '')
    this.model = options?.model ?? '@cf/meta/m2m100-1.2b'
    this.timeoutMs = Math.min(Math.max(options?.timeoutMs ?? 5000, 500), 10000)
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
      const err = new Error(
        '[CloudflareTranslatorProvider] Provider is unconfigured: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.'
      )
      ;(err as any).status = 401
      throw err
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`
    const source_lang = this.normalizeLanguage(sourceLocale)
    const target_lang = this.normalizeLanguage(targetLocale)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(endpoint, {
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

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        const err = new Error(
          `[CloudflareTranslatorProvider] HTTP ${response.status} ${response.statusText}: ${errorText.substring(
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
      if (!json || json.success === false) {
        const msg = json?.errors?.[0]?.message || 'Workers AI returned unsuccessful status'
        const err = new Error(`[CloudflareTranslatorProvider] ${msg}`)
        ;(err as any).status = 502
        throw err
      }

      const translated = json?.result?.translated_text
      if (typeof translated !== 'string' || !translated.trim()) {
        return text
      }

      return translated
    } catch (err: unknown) {
      if ((err as any)?.name === 'AbortError') {
        const timeoutErr = new Error(`[CloudflareTranslatorProvider] Request timed out after ${this.timeoutMs}ms`)
        ;(timeoutErr as any).status = 504
        throw timeoutErr
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    return this.translateText(translationKey, targetLocale, 'en')
  }

  async translateBatch(texts: string[], targetLocale: string, sourceLocale: string = 'en'): Promise<string[]> {
    if (!texts || texts.length === 0) return []
    if (targetLocale === sourceLocale) return texts

    // Translate items concurrently
    const results = await Promise.all(
      texts.map((t) =>
        this.translateText(t, targetLocale, sourceLocale).catch((err) => {
          throw err
        })
      )
    )

    return results
  }
}
