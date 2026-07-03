import type { Payload, PayloadRequest } from 'payload'
import { createHash } from 'crypto'
import type { TranslationProvider } from './providers/types'
import { GoogleTranslateProvider } from './providers/google'
import { LibreTranslateProvider } from './providers/libre'

/** Default TTL for cached translations: 30 days */
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30

/**
 * Translation Domain Service
 *
 * Responsibilities:
 * - Hash-based cache lookup with version & TTL validation
 * - Fallback strategy across multiple translation providers
 * - Persistent caching of translated text in database
 *
 * This service is Infrastructure-agnostic:
 * swapping Google for DeepL requires changing only the provider list.
 */
export class TranslationService {
  private payload: Payload
  private providers: TranslationProvider[]

  constructor(payload: Payload) {
    this.payload = payload

    // Provider priority chain — first succeeds wins
    this.providers = [
      new GoogleTranslateProvider(),
      new LibreTranslateProvider(),
    ]
  }

  /**
   * Generate SHA-256 hash of text for cache lookup
   */
  private hash(text: string): string {
    return createHash('sha256').update(text).digest('hex')
  }

  /**
   * Translate text with cache-first strategy and provider fallback.
   * @param text - Original English text
   * @param to - Target locale (e.g. 'ar', 'fr')
   * @param version - Source document version (invalidates stale cache)
   * @param req - Payload request context for transaction propagation
   */
  async translate(
    text: string,
    to: string,
    version: number = 1,
    req?: PayloadRequest,
  ): Promise<string> {
    if (!text || text.trim() === '') return ''
    if (to === 'en') return text // Source language is always English

    const trimmedText = text.trim()
    const originalHash = this.hash(trimmedText)

    // 1. Check persistent cache
    const cached = await this.payload.find({
      collection: 'translation-cache',
      where: {
        and: [
          { originalHash: { equals: originalHash } },
          { language: { equals: to } },
          { version: { greater_than_equal: version } },
          { expiresAt: { greater_than: new Date().toISOString() } },
        ],
      },
      limit: 1,
      req,
    })

    if (cached.docs.length > 0) {
      return cached.docs[0].translatedText
    }

    // 2. Fallback strategy — try providers in priority order
    let translatedText: string | null = null
    let usedProvider: string = 'unknown'

    for (const provider of this.providers) {
      try {
        translatedText = await provider.translate(trimmedText, 'en', to)
        usedProvider = provider.name
        break
      } catch (error) {
        console.warn(`[TranslationService] Provider "${provider.name}" failed, trying next...`, error)
      }
    }

    // 3. If all providers failed, gracefully return original English text
    if (!translatedText) {
      console.error(`[TranslationService] All providers failed for hash=${originalHash.substring(0, 8)}. Returning English fallback.`)
      return trimmedText
    }

    // 4. Persist to cache
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString()

    await this.payload.create({
      collection: 'translation-cache',
      data: {
        originalHash,
        sourceText: trimmedText,
        language: to,
        translatedText,
        provider: usedProvider,
        version,
        expiresAt,
      },
      req,
    })

    return translatedText
  }

  /**
   * Translate multiple fields of an object at once.
   * Useful for translating an entire document (title, description, etc.)
   */
  async translateFields(
    fields: Record<string, string>,
    to: string,
    version: number = 1,
    req?: PayloadRequest,
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {}

    for (const [key, value] of Object.entries(fields)) {
      result[key] = await this.translate(value, to, version, req)
    }

    return result
  }
}
