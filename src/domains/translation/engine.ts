import type { TranslationRepository } from './repository'
import { GoogleTranslateProvider } from './providers/google-provider'
import type { ITranslationProvider } from './providers/provider.interface'
import type { TranslationRecordEntity } from './types'

/**
 * Two-Tiered Translation Engine
 * Tier 1: Memory / DB Cache lookup.
 * Tier 2: Third-party provider fallback (Zero Latency Policy - cached permanently).
 */
export class TranslationEngine {
  private repository: TranslationRepository
  private provider: ITranslationProvider

  constructor(repository: TranslationRepository, provider?: ITranslationProvider) {
    this.repository = repository
    this.provider = provider || new GoogleTranslateProvider()
  }

  async translate(translationKey: string, locale: string): Promise<TranslationRecordEntity> {
    // Tier 1: Cache lookup
    const cached = await this.repository.findByKeyAndLocale(translationKey, locale)
    if (cached) return cached

    // Tier 2: Provider execution
    const translatedText = await this.provider.translateKey(translationKey, locale)

    const record: TranslationRecordEntity = {
      translationId: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      translationKey,
      locale,
      translatedText,
      provider: 'google',
      cachedAt: new Date().toISOString(),
    }

    return this.repository.saveTranslation(record)
  }
}
