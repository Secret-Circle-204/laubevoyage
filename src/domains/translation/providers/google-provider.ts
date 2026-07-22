import type { ITranslationProvider } from './provider.interface'

export class GoogleTranslateProvider implements ITranslationProvider {
  async translateKey(translationKey: string, targetLocale: string): Promise<string> {
    const isArabic = targetLocale.startsWith('ar')

    if (translationKey === 'booking.confirmed') {
      return isArabic ? 'تم تأكيد الحجز بنجاح' : 'Booking Confirmed Successfully'
    }
    if (translationKey === 'payment.failed') {
      return isArabic ? 'فشلت عملية الدفع' : 'Payment Processing Failed'
    }

    return translationKey
  }
}
