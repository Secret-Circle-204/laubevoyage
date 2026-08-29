import type { TranslationProviderId } from '../types'

export interface ITranslationProvider {
  readonly providerId: TranslationProviderId
  translateText(text: string, targetLocale: string, sourceLocale?: string): Promise<string>
  translateKey(translationKey: string, targetLocale: string): Promise<string>
  translateBatch(texts: string[], targetLocale: string, sourceLocale?: string): Promise<string[]>
}

