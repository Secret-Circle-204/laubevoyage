import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout } from '../email-layout'

export function renderLoyaltyEarnedEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  const points = Number(templateData['points'] ?? 0)
  const balance = templateData['balance'] !== undefined ? Number(templateData['balance']) : undefined
  const balanceText = balance !== undefined
    ? ` (${dict.get(locale, 'emails.welcome.currentBalance', { balance })})`
    : ''
  const subject = dict.get(locale, 'emails.templates.loyaltyEarned.subject', { points })
  const body = dict.get(locale, 'emails.templates.loyaltyEarned.body', { points, balanceText })
  const badgeText = dict.get(locale, 'emails.templates.loyaltyEarned.badge')

  const html = buildBrandEmailLayout(
    {
      locale,
      preheader: subject,
      badgeText,
      badgeType: 'gold',
      heading: subject,
      contentHtml: `<p style="font-size: 15px; line-height: 1.7; color: #374151;">${body}</p>`,
    },
    dict,
  )

  return { subject, body, html }
}
