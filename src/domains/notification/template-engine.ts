/**
 * Bilingual Notification Template Engine
 * Renders HTML/Text template contents using template data variables and language preference.
 */
export class NotificationTemplateEngine {
  static renderTemplate(
    templateId: string,
    templateData: Record<string, any>,
    locale = 'en',
  ): { subject: string; body: string } {
    const isArabic = locale.startsWith('ar')

    if (templateId === 'booking_confirmation') {
      const bookingNumber = templateData.bookingNumber || '#LBV-000'
      const subject = isArabic ? `تأكيد الحجز ${bookingNumber}` : `Booking Confirmation ${bookingNumber}`
      const body = isArabic
        ? `مرحباً ${templateData.customerName || ''}، تم تأكيد حجزك رقم ${bookingNumber} بنجاح.`
        : `Hello ${templateData.customerName || ''}, your booking ${bookingNumber} has been confirmed successfully.`
      return { subject, body }
    }

    if (templateId === 'payment_receipt') {
      const subject = isArabic ? 'إيصال استلام الدفع' : 'Payment Receipt'
      const body = isArabic
        ? `تم استلام مبلغ ${templateData.amount || ''} ${templateData.currency || 'EGP'} بنجاح.`
        : `Payment of ${templateData.amount || ''} ${templateData.currency || 'EGP'} received successfully.`
      return { subject, body }
    }

    return {
      subject: `Notification (${templateId})`,
      body: JSON.stringify(templateData),
    }
  }
}
