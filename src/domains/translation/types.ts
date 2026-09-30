export type TranslationProviderId =
  | 'cache'
  | 'google'
  | 'libre'
  | 'manual'
  | 'azure'
  | 'cloudflare'
  | 'google-cloud'

export interface TranslationRecordEntity {
  translationId: string
  translationKey: string // e.g. 'booking.confirmed', 'payment.failed'
  locale: string // e.g. 'ar', 'en'
  translatedText: string
  provider: TranslationProviderId
  cachedAt: string
}

export interface TranslationResultWithProvenance {
  readonly text: string
  readonly providerId: TranslationProviderId
}

export interface BatchTranslationResultWithProvenance {
  readonly texts: string[]
  readonly providerId: TranslationProviderId
}

