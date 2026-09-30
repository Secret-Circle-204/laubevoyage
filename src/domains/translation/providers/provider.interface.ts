import type { TranslationProviderId, TranslationResultWithProvenance, BatchTranslationResultWithProvenance } from '../types'

export interface ITranslationProvider {
  readonly providerId: TranslationProviderId
  translateText(text: string, targetLocale: string, sourceLocale?: string): Promise<string>
  translateKey(translationKey: string, targetLocale: string): Promise<string>
  translateBatch(texts: string[], targetLocale: string, sourceLocale?: string): Promise<string[]>

  translateTextWithProvenance(
    text: string,
    targetLocale: string,
    sourceLocale?: string
  ): Promise<TranslationResultWithProvenance>

  translateBatchWithProvenance(
    texts: string[],
    targetLocale: string,
    sourceLocale?: string
  ): Promise<BatchTranslationResultWithProvenance>
}

