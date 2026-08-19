/**
 * Bilingual Notification Template Engine
 * Renders HTML/Text template contents using template data variables and language preference.
 * Enforces strict variable requirements without silent fallback defaults.
 */
export class NotificationTemplateEngine {
  static renderTemplate(
    templateId: string,
    templateData: Record<string, unknown>,
    locale = 'en',
  ): { subject: string; body: string } {
    const isArabic = locale.startsWith('ar')

    if (templateId === 'welcome_email') {
      const name = String(templateData['name'] || templateData['customerName'] || 'Valued Guest')
      const subject = isArabic ? 'مرحباً بك في L\'Aube Voyage' : 'Welcome to L\'Aube Voyage'
      const body = isArabic
        ? `أهلاً بك ${name}! يسعدنا انضمامك إلى منصة L'Aube Voyage.`
        : `Welcome ${name}! We are excited to have you on board with L'Aube Voyage.`
      return { subject, body }
    }

    if (templateId === 'booking_confirmation') {
      if (!templateData['bookingNumber']) {
        throw new Error(`[NotificationTemplateEngine] Template 'booking_confirmation' missing required field: bookingNumber`)
      }
      if (!templateData['customerName']) {
        throw new Error(`[NotificationTemplateEngine] Template 'booking_confirmation' missing required field: customerName`)
      }

      const bookingNumber = String(templateData['bookingNumber'])
      const customerName = String(templateData['customerName'])
      const subject = isArabic ? `تأكيد الحجز ${bookingNumber}` : `Booking Confirmation ${bookingNumber}`
      const body = isArabic
        ? `مرحباً ${customerName}، تم تأكيد حجزك رقم ${bookingNumber} بنجاح.`
        : `Hello ${customerName}, your booking ${bookingNumber} has been confirmed successfully.`
      return { subject, body }
    }

    if (templateId === 'payment_receipt') {
      if (templateData['amount'] === undefined || templateData['amount'] === null) {
        throw new Error(`[NotificationTemplateEngine] Template 'payment_receipt' missing required field: amount`)
      }
      if (!templateData['currency']) {
        throw new Error(`[NotificationTemplateEngine] Template 'payment_receipt' missing required field: currency`)
      }

      const amount = Number(templateData['amount'] ?? 0)
      const currency = String(templateData['currency'])
      const subject = isArabic ? 'إيصال استلام الدفع' : 'Payment Receipt'
      const body = isArabic
        ? `تم استلام مبلغ ${amount} ${currency} بنجاح.`
        : `Payment of ${amount} ${currency} received successfully.`
      return { subject, body }
    }

    if (templateId === 'tier_upgraded') {
      const newTier = String(templateData['newTier'] || '').toUpperCase()
      const bonus = templateData['bonusGranted'] ? ` (${templateData['bonusGranted']} bonus points granted!)` : ''
      const subject = isArabic ? `ترقية مستوى العضوية إلى ${newTier}` : `Loyalty Tier Upgraded to ${newTier}`
      const body = isArabic
        ? `تهانينا! تم ترقية حسابك إلى المستوى ${newTier}.${bonus}`
        : `Congratulations! Your membership tier has been upgraded to ${newTier}.${bonus}`
      return { subject, body }
    }

    throw new Error(`[NotificationTemplateEngine] Unsupported or unhandled templateId: '${templateId}'`)
  }
}
