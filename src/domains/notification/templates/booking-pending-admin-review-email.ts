import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout } from '../email-layout'

export function renderBookingPendingAdminReviewEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  if (!templateData['bookingNumber']) {
    throw new Error(
      `[NotificationTemplateEngine] Template 'booking_pending_admin_review' missing required field: bookingNumber`,
    )
  }
  if (!templateData['customerName']) {
    throw new Error(
      `[NotificationTemplateEngine] Template 'booking_pending_admin_review' missing required field: customerName`,
    )
  }

  const bookingNumber = String(templateData['bookingNumber'])
  const customerName = String(templateData['customerName'])
  const experienceTitle = templateData['experienceTitle'] ? ` for "${templateData['experienceTitle']}"` : ''
  const departureDate = templateData['departureDate'] ? ` on ${templateData['departureDate']}` : ''
  const passengersCount = templateData['passengersCount'] ? ` (${templateData['passengersCount']} travelers)` : ''
  const totalCost = templateData['totalCost'] ? ` (Total: ${templateData['totalCost']})` : ''

  const subject = dict.get(locale, 'emails.templates.bookingPendingAdminReview.subject', { bookingNumber })
  const body = dict.get(locale, 'emails.templates.bookingPendingAdminReview.body', {
    customerName,
    bookingNumber,
    experienceTitle,
    departureDate,
    passengersCount,
    totalCost,
  })
  const badgeText = dict.get(locale, 'emails.templates.bookingPendingAdminReview.badge')

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
