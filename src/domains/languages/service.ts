import type { LanguageRepository } from './repository'
import type { Language } from './types'

export class LanguageService {
  private repository: LanguageRepository

  constructor(repository: LanguageRepository) {
    this.repository = repository
  }

  /**
   * Domain Gateway method for retrieving all active languages.
   */
  async getActiveLanguages(): Promise<Language[]> {
    return this.repository.findActiveLanguages()
  }

  /**
   * Domain Gateway method for retrieving the default fallback language.
   */
  async getDefaultLanguage(): Promise<Language | null> {
    return this.repository.getDefaultLanguage()
  }

  /**
   * Invalidate the in-memory cache manually.
   */
  invalidateCache(): void {
    this.repository.invalidateCache()
  }
}
