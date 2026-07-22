export interface ITranslationProvider {
  translateKey(translationKey: string, targetLocale: string): Promise<string>
}
