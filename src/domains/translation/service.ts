import type { PayloadRequest } from 'payload'
import { TranslationRepository } from './repository'
import { TranslationEngine } from './engine'
import type { ITranslationProvider } from './providers/provider.interface'
import type { TranslationRecordEntity } from './types'
import { TranslationBlackoutError } from './errors/provider-errors'

/**
 * Translation Domain Service (Enterprise Facade)
 * Single entry point for all customer-facing translation requests.
 * Orchestrates cache lookups, provider executions, and safe source-text degradation.
 */
export class TranslationService {
  private repository: TranslationRepository
  private engine: TranslationEngine

  constructor(repository: TranslationRepository, provider?: ITranslationProvider) {
    this.repository = repository
    this.engine = new TranslationEngine(this.repository, provider)
  }

  async getTranslation(translationKey: string, locale: string): Promise<TranslationRecordEntity> {
    return this.engine.translate(translationKey, locale)
  }

  async translate(
    text: string,
    locale: string,
    _version?: number,
    _req?: PayloadRequest,
  ): Promise<string> {
    try {
      const record = await this.engine.translate(text, locale)
      return record.translatedText
    } catch (err: unknown) {
      if (err instanceof TranslationBlackoutError) {
        console.warn(
          `[TranslationService] Single text translation blackout for "${text}". Safely degrading to source text with ZERO persistence.`
        )
        return text
      }
      // Internal application defects are re-thrown so monitoring and tests can observe them
      throw err
    }
  }

  async translateBatch(texts: string[], locale: string): Promise<string[]> {
    try {
      return await this.engine.translateBatch(texts, locale)
    } catch (err: unknown) {
      if (err instanceof TranslationBlackoutError) {
        console.warn(
          `[TranslationService] Batch translation blackout for ${texts.length} texts. Safely degrading to source texts with ZERO persistence.`
        )
        return texts
      }
      throw err
    }
  }

  async translateFields(
    fields: Record<string, string>,
    locale: string,
    _version?: number,
    _req?: PayloadRequest,
  ): Promise<Record<string, string>> {
    const keys = Object.keys(fields)
    const values = Object.values(fields)
    const translatedValues = await this.engine.translateBatch(values, locale)

    const result: Record<string, string> = {}
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = translatedValues[i] || values[i]
    }
    return result
  }
}
