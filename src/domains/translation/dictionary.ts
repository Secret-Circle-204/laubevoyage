import enDict from '../../dictionaries/en.json'
import arDict from '../../dictionaries/ar.json'
import frDict from '../../dictionaries/fr.json'
import deDict from '../../dictionaries/de.json'
import esDict from '../../dictionaries/es.json'
import itDict from '../../dictionaries/it.json'
import ruDict from '../../dictionaries/ru.json'
import zhDict from '../../dictionaries/zh.json'
import jaDict from '../../dictionaries/ja.json'
import ptDict from '../../dictionaries/pt.json'
import nlDict from '../../dictionaries/nl.json'
import plDict from '../../dictionaries/pl.json'
import fiDict from '../../dictionaries/fi.json'

/**
 * Interface abstraction for UI Translation Dictionary (Dependency Inversion Principle).
 * Allows future replacement with CDN, Redis, or Remote API without altering LocalizationService.
 */
export interface ITranslationDictionary {
  get(locale: string, key: string): string
}

const DICTIONARIES: Record<string, any> = {
  en: enDict,
  ar: arDict,
  fr: frDict,
  de: deDict,
  es: esDict,
  it: itDict,
  ru: ruDict,
  zh: zhDict,
  ja: jaDict,
  pt: ptDict,
  nl: nlDict,
  pl: plDict,
  fi: fiDict,
}

/**
 * JSON-based Implementation of ITranslationDictionary.
 * Loads structured dot-notation keys (e.g., 'hero.title', 'layout.nav.home') synchronously with zero DB queries.
 */
export class JsonTranslationDictionary implements ITranslationDictionary {
  /**
   * Strict retrieval of a localized key from the specified locale ONLY.
   * Returns undefined if the key does not exist in the specified locale dictionary (NO English fallback masking).
   */
  getStrict(locale: string, key: string): string | undefined {
    const normLocale = (locale || 'en').toLowerCase()
    const dict = DICTIONARIES[normLocale]
    if (!dict) return undefined
    return this.getNestedValue(dict, key)
  }

  hasKey(locale: string, key: string): boolean {
    return this.getStrict(locale, key) !== undefined
  }

  get(locale: string, key: string): string {
    const normLocale = (locale || 'en').toLowerCase()
    const dict = DICTIONARIES[normLocale] || DICTIONARIES['en']

    const value = this.getNestedValue(dict, key)
    if (value) return value

    // Fallback to English dictionary if key missing in requested locale
    const fallbackValue = this.getNestedValue(DICTIONARIES['en'], key)
    return fallbackValue || key
  }

  private getNestedValue(obj: any, path: string): string | undefined {
    if (!obj || !path) return undefined
    const keys = path.split('.')
    let current = obj

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      } else {
        return undefined
      }
    }

    return typeof current === 'string' ? current : undefined
  }
}
