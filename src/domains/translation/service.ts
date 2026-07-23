import type { PayloadRequest } from 'payload'
import { TranslationRepository } from './repository'
import { TranslationEngine } from './engine'
import type { TranslationRecordEntity } from './types'
import { TranslationProviderFactory } from './factory/translation-provider-factory'

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

  async getSupportedLocales(): Promise<Array<{ code: string; name: string }>> {
    return this.repository.findActiveLocales()
  }

  async getTranslation(translationKey: string, locale: string): Promise<TranslationRecordEntity> {
    return this.engine.translate(translationKey, locale)
  }

  async translate(text: string, locale: string, _version?: number, _req?: PayloadRequest): Promise<string> {
    try {
      const record = await this.engine.translate(text, locale)
      if (record?.translatedText) return record.translatedText
    } catch {
      // Fallback via TranslationProviderFactory
    }

    const provider = TranslationProviderFactory.getProvider('google')
    return provider.translateText(text, locale)
  }

  async translateFields(
    fields: Record<string, string>,
    locale: string,
    _version?: number,
    _req?: PayloadRequest,
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(fields)) {
      result[key] = await this.translate(value, locale)
    }
    return result
  }
}
