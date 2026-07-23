import type { Payload } from 'payload'
import { TranslationRepository } from './repository'
import { TranslationEngine } from './engine'
import type { TranslationRecordEntity } from './types'

/**
 * Translation Domain Service (Enterprise Thin Facade)
 * Single entry point for all multilingual translation requests.
 */
export class TranslationService {
  private repository: TranslationRepository
  private engine: TranslationEngine

  constructor(payload: Payload) {
    this.repository = new TranslationRepository(payload)
    this.engine = new TranslationEngine(this.repository)
  }

  async getTranslation(translationKey: string, locale: string): Promise<TranslationRecordEntity> {
    return this.engine.translate(translationKey, locale)
  }

  async translate(text: string, locale: string, _version?: number, _req?: any): Promise<string> {
    const record = await this.engine.translate(text, locale)
    return record.translatedText
  }

  async translateFields(
    fields: Record<string, string>,
    locale: string,
    _version?: number,
    _req?: any,
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(fields)) {
      result[key] = await this.translate(value, locale)
    }
    return result
  }
}

