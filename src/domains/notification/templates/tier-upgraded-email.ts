import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout } from '../email-layout'

export function renderTierUpgradedEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  const newTier = String(templateData['newTier'] || '').toUpperCase()
  const bonus = templateData['bonusGranted'] ? ` (${templateData['bonusGranted']} bonus points granted!)` : ''
  const subject = dict.get(locale, 'emails.templates.tierUpgraded.subject', { newTier })
  const body = dict.get(locale, 'emails.templates.tierUpgraded.body', { newTier, bonus })
  const badgeText = dict.get(locale, 'emails.templates.tierUpgraded.badge')

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
