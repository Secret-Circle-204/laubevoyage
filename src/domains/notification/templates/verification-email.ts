import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout } from '../email-layout'

export function renderVerificationEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  const verifyUrl = String(templateData['verificationUrl'] || '')
  if (!verifyUrl) {
    throw new Error(
      `[NotificationTemplateEngine] Template 'verification_email' missing required field: 'verificationUrl'`,
    )
  }

  const defaultName = dict.get(locale, 'emails.common.defaultName')
  const name = String(templateData['name'] || defaultName)

  const subject = dict.get(locale, 'emails.verification.subject')
  const preheader = dict.get(locale, 'emails.verification.preheader')
  const badge = dict.get(locale, 'emails.verification.badge')
  const title = dict.get(locale, 'emails.verification.title')
  const greeting = dict.get(locale, 'emails.verification.greeting', { name })
  const intro = dict.get(locale, 'emails.verification.intro')
  const cta = dict.get(locale, 'emails.verification.cta')
  const expiryNotice = dict.get(locale, 'emails.verification.expiryNotice')
  const troubleLink = dict.get(locale, 'emails.verification.troubleLink')
  const ignoreNotice = dict.get(locale, 'emails.verification.ignoreNotice')

  const body = `${greeting}\n\n${intro}\n\n${verifyUrl}\n\n${expiryNotice}\n\n${ignoreNotice}`

  const contentHtml = `
    <p style="font-size: 15px; line-height: 1.7; color: #374151; margin: 0 0 16px 0;">${greeting}</p>
    <p style="font-size: 15px; line-height: 1.7; color: #374151; margin: 0 0 20px 0;">${intro}</p>
  `

  const secondaryNoteHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin: 24px 0; font-size: 13px; line-height: 1.6; color: #64748B;">
      <strong style="color: #1E293B;">🔒 ${expiryNotice}</strong>
    </div>
    <div style="font-size: 12px; color: #94A3B8; line-height: 1.6; margin-top: 16px; word-break: break-all;">
      ${troubleLink}<br />
      <a href="${verifyUrl}" style="color: #2E3192; text-decoration: underline;">${verifyUrl}</a>
    </div>
    <div style="font-size: 12px; color: #94A3B8; line-height: 1.6; margin-top: 12px;">
      ${ignoreNotice}
    </div>
  `

  const html = buildBrandEmailLayout(
    {
      locale,
      preheader,
      badgeText: badge,
      badgeType: 'security',
      heading: title,
      contentHtml,
      ctaText: cta,
      ctaUrl: verifyUrl,
      secondaryNoteHtml,
    },
    dict,
  )

  return { subject, body, html }
}
