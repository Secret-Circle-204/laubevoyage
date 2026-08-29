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

