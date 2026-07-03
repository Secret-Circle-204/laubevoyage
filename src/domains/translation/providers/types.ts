/**
 * Translation Provider Interface
 * All translation engines must implement this contract.
 * Swapping providers (Google, DeepL, LibreTranslate, OpenAI)
 * requires zero changes in the Translation Domain or any other service.
 */
export interface TranslationProvider {
  /** Unique provider identifier (e.g. 'google', 'libre', 'deepl') */
  readonly name: string

  /**
   * Translate text from source language to target language.
   * @throws Error if the provider fails (network, quota, etc.)
   */
  translate(text: string, from: string, to: string): Promise<string>
}
