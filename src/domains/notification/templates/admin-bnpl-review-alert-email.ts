import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout } from '../email-layout'

export function renderAdminBnplReviewAlertEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  if (!templateData['bookingNumber']) {
    throw new Error(`[NotificationTemplateEngine] Template 'admin_bnpl_review_alert' missing required field: bookingNumber`)
  }
  if (!templateData['customerName']) {
    throw new Error(`[NotificationTemplateEngine] Template 'admin_bnpl_review_alert' missing required field: customerName`)
  }

  const bookingNumber = String(templateData['bookingNumber'])
  const customerName = String(templateData['customerName'])
  const customerEmail = templateData['customerEmail'] ? ` (${templateData['customerEmail']})` : ''
  const experienceTitle = templateData['experienceTitle'] ? ` for "${templateData['experienceTitle']}"` : ''
  const departureDate = templateData['departureDate'] ? ` on ${templateData['departureDate']}` : ''
  const passengersCount = templateData['passengersCount'] ? ` (${templateData['passengersCount']} travelers)` : ''
  const totalAmount = templateData['totalAmount'] ? ` Total: ${templateData['totalAmount']},` : ''
  const adminBookingUrl = templateData['adminBookingUrl'] ? ` Review in admin portal: ${templateData['adminBookingUrl']}` : ''

  const subject = dict.get(locale, 'emails.templates.adminBnplReviewAlert.subject', { bookingNumber })
  const body = dict.get(locale, 'emails.templates.adminBnplReviewAlert.body', {
    bookingNumber,
    customerName,
    customerEmail,
    experienceTitle,
    departureDate,
    passengersCount,
    totalAmount,
    adminBookingUrl,
  })
  const badgeText = dict.get(locale, 'emails.templates.adminBnplReviewAlert.badge')

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
