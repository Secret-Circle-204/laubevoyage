import type { ITranslationProvider } from './provider.interface'

const DICTIONARY: Record<string, Record<string, string>> = {
  'booking.confirmed': { ar: 'تم تأكيد الحجز بنجاح', en: 'Booking Confirmed Successfully' },
  'payment.failed': { ar: 'فشلت عملية الدفع', en: 'Payment Processing Failed' },
}

export class GoogleTranslateProvider implements ITranslationProvider {
  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    if (!translationKey) return ''
    const lang = targetLocale.startsWith('ar') ? 'ar' : 'en'
    if (DICTIONARY[translationKey]?.[lang]) {
      return DICTIONARY[translationKey][lang]
    }
    const parts = translationKey.split('.')
    const rawText = parts[parts.length - 1].replace(/_/g, ' ')
    return rawText.charAt(0).toUpperCase() + rawText.slice(1)
  }
}
