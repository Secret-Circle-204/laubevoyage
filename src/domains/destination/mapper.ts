import type { CountryConfiguration } from './country-registry'

/**
 * Country Mapper
 * Pure mapper that isolates Payload database document structures and relationship variations,
 * translating them into clean, pure domain-level CountryConfiguration DTOs.
 */
export class CountryMapper {
  static toDomain(doc: any): CountryConfiguration {
    const codeUpper = (doc.code || '').toUpperCase().trim()

    // 1. Safe currency relation extraction
    let currencyCode: string | null = null
    if (doc.currency) {
      if (typeof doc.currency === 'object' && 'isoCode' in doc.currency) {
        currencyCode = doc.currency.isoCode
      } else if (typeof doc.currency === 'string') {
        currencyCode = doc.currency
      }
    }

    // 2. Safe defaultLanguage relation extraction
    let defaultLanguageCode: string | null = null
    if (doc.defaultLanguage) {
      if (typeof doc.defaultLanguage === 'object' && 'code' in doc.defaultLanguage) {
        defaultLanguageCode = doc.defaultLanguage.code
      } else if (typeof doc.defaultLanguage === 'string') {
        defaultLanguageCode = doc.defaultLanguage
      }
    }

    return {
      code: codeUpper,
      name: doc.name,
      currencyCode: currencyCode ? currencyCode.toUpperCase() : null,
      defaultLanguageCode: defaultLanguageCode ? defaultLanguageCode.toLowerCase() : null,
      timezone: doc.timezone || null,
      measurementSystem: doc.measurementSystem || 'metric',
      weekStart: typeof doc.weekStart === 'number' ? doc.weekStart : 1,
      isActive: doc.isActive ?? true,
    }
  }
}
