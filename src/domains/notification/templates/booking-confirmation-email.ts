import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout } from '../email-layout'

export function renderBookingConfirmationEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  if (!templateData['bookingNumber']) {
    throw new Error(`[NotificationTemplateEngine] Template 'booking_confirmation' missing required field: bookingNumber`)
  }
  if (!templateData['customerName']) {
    throw new Error(`[NotificationTemplateEngine] Template 'booking_confirmation' missing required field: customerName`)
  }

  const bookingNumber = String(templateData['bookingNumber'])
  const customerName = String(templateData['customerName'])
  const subject = dict.get(locale, 'emails.templates.bookingConfirmation.subject', { bookingNumber })
  const body = dict.get(locale, 'emails.templates.bookingConfirmation.body', { customerName, bookingNumber })
  const badgeText = dict.get(locale, 'emails.templates.bookingConfirmation.badge')

  const html = buildBrandEmailLayout(
    {
      locale,
      preheader: subject,
      badgeText,
      badgeType: 'primary',
      heading: subject,
      contentHtml: `<p style="font-size: 15px; line-height: 1.7; color: #374151;">${body}</p>`,
    },
    dict,
  )

  return { subject, body, html }
}
