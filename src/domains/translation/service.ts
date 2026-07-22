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
}
