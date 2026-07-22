export interface TranslationRecordEntity {
  translationId: string
  translationKey: string // e.g. 'booking.confirmed', 'payment.failed'
  locale: string // e.g. 'ar', 'en'
  translatedText: string
  provider: 'cache' | 'google' | 'libre' | 'manual'
  cachedAt: string
}
