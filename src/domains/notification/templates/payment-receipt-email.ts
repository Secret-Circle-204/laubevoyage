import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout } from '../email-layout'

export function renderPaymentReceiptEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  if (templateData['amount'] === undefined || templateData['amount'] === null) {
    throw new Error(`[NotificationTemplateEngine] Template 'payment_receipt' missing required field: amount`)
  }
  if (!templateData['currency']) {
    throw new Error(`[NotificationTemplateEngine] Template 'payment_receipt' missing required field: currency`)
  }

  const amount = Number(templateData['amount'] ?? 0)
  const currency = String(templateData['currency'])
  const subject = dict.get(locale, 'emails.templates.paymentReceipt.subject')
  const body = dict.get(locale, 'emails.templates.paymentReceipt.body', { amount, currency })
  const badgeText = dict.get(locale, 'emails.templates.paymentReceipt.badge')

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
