export interface TranslationProvider {
  readonly providerId: string

  translateText(text: string, targetLocale: string, sourceLocale?: string): Promise<string>

  translateBatch(texts: string[], targetLocale: string, sourceLocale?: string): Promise<string[]>
}
