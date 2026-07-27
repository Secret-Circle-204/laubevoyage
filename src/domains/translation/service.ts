import type { PayloadRequest } from 'payload'
import { TranslationRepository } from './repository'
import { TranslationEngine } from './engine'
import type { TranslationRecordEntity } from './types'

/**
 * Translation Domain Service (Enterprise Thin Facade)
 * Single entry point for all multilingual translation requests via Constructor Dependency Injection.
 */
export class TranslationService {
  private repository: TranslationRepository
  private engine: TranslationEngine

  constructor(repository: TranslationRepository) {
    this.repository = repository
    this.engine = new TranslationEngine(this.repository)
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
    const record = await this.engine.translate(text, locale)
    return record?.translatedText || text
  }

  async translateBatch(texts: string[], locale: string): Promise<string[]> {
    return this.engine.translateBatch(texts, locale)
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
