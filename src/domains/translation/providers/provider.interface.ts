export interface ITranslationProvider {
  readonly providerId: string
  translateText(text: string, targetLocale: string, sourceLocale?: string): Promise<string>
  translateKey(translationKey: string, targetLocale: string): Promise<string>
  translateBatch(texts: string[], targetLocale: string, sourceLocale?: string): Promise<string[]>
}
