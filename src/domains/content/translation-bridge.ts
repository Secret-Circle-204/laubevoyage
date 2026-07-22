import type { Payload } from 'payload'
import { TranslationService } from '../translation/service'

/**
 * Content Bilingual Translation Bridge
 * Integrates CMS content with TranslationService using fixed translation keys.
 */
export class ContentTranslationBridge {
  private translationService: TranslationService

  constructor(payload: Payload) {
    this.translationService = new TranslationService(payload)
  }

  async getBilingualContent(translationKey: string, locale: string): Promise<string> {
    const record = await this.translationService.getTranslation(translationKey, locale)
    return record.translatedText
  }
}
