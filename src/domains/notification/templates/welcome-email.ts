import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout, getServerUrl } from '../email-layout'

export function renderWelcomeEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  const isArabic = locale.toLowerCase().startsWith('ar')
  const dir = isArabic ? 'rtl' : 'ltr'
  const textAlign = isArabic ? 'right' : 'left'

  const defaultName = dict.get(locale, 'emails.common.defaultName')
  const name = String(templateData['name'] || templateData['customerName'] || defaultName)
  const bonusPoints = typeof templateData['bonusPoints'] === 'number' ? templateData['bonusPoints'] : undefined
  const balance = typeof templateData['balance'] === 'number' ? templateData['balance'] : undefined

  const subject = dict.get(locale, 'emails.welcome.subject')
  const preheader = dict.get(locale, 'emails.welcome.preheader')
  const badge = dict.get(locale, 'emails.welcome.badge')
  const title = dict.get(locale, 'emails.welcome.title')
  const greeting = dict.get(locale, 'emails.welcome.greeting', { name })
  const intro = dict.get(locale, 'emails.welcome.intro')
  const loyaltyBadge = dict.get(locale, 'emails.welcome.loyaltyBadge')
  const pointsTitle = dict.get(locale, 'emails.welcome.pointsTitle')
  const pointsDescription = dict.get(locale, 'emails.welcome.pointsDescription')
  const cta = dict.get(locale, 'emails.welcome.cta')
  const outro = dict.get(locale, 'emails.welcome.outro')
  const signature = dict.get(locale, 'emails.welcome.signature')

  let pointsSummary = ''
  if (typeof bonusPoints === 'number' && bonusPoints > 0) {
    const pointsLabel = dict.get(locale, 'emails.common.pointsLabel')
    const balanceNotice = balance !== undefined
      ? ` (${dict.get(locale, 'emails.welcome.currentBalance', { balance })})`
      : ''
    pointsSummary = `\n\n${pointsTitle}: +${bonusPoints} ${pointsLabel}${balanceNotice}\n${pointsDescription}`
  }

  const serverUrl = getServerUrl()
  const experiencesUrl = `${serverUrl}/experiences`

  const body = `${greeting}\n\n${intro}${pointsSummary}\n\n${outro}\n\n${experiencesUrl}\n\n${signature}`

  let loyaltyCardHtml = ''
  if (typeof bonusPoints === 'number' && bonusPoints > 0) {
    const pointsLabel = dict.get(locale, 'emails.common.pointsLabel')
    const currentBalanceHtml = balance !== undefined
      ? `<div style="font-size: 13px; font-weight: 600; color: #6B7280; padding-top: 12px; border-top: 1px solid #E5DFD7; margin-top: 12px;">
          ${dict.get(locale, 'emails.welcome.currentBalance', { balance })}
        </div>`
      : ''

    loyaltyCardHtml = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F5; border: 1px solid #E8E2D9; border-radius: 10px; margin: 24px 0; padding: 24px; text-align: ${textAlign};" dir="${dir}">
        <tr>
          <td>
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #D97706; margin-bottom: 6px;">
              ${loyaltyBadge}
            </div>
            <div style="font-size: 17px; font-weight: 700; color: #1B1E4B; margin-bottom: 8px;">
              ${pointsTitle}
            </div>
            <div style="font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 16px;">
              ${pointsDescription}
            </div>
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 12px 0;">
              <tr>
                <td style="font-size: 38px; font-weight: 800; color: #F58220; line-height: 1; letter-spacing: -1px;">
                  +${bonusPoints}
                </td>
                <td style="padding-${isArabic ? 'right' : 'left'}: 10px; font-size: 13px; font-weight: 700; color: #2E3192; text-transform: uppercase; letter-spacing: 1px;">
                  ${pointsLabel}
                </td>
              </tr>
            </table>
            ${currentBalanceHtml}
          </td>
        </tr>
      </table>
    `
  }

  const contentHtml = `
    <p style="font-size: 15px; line-height: 1.7; color: #374151; margin: 0 0 16px 0;">${greeting}</p>
    <p style="font-size: 15px; line-height: 1.7; color: #374151; margin: 0 0 20px 0;">${intro}</p>
    ${loyaltyCardHtml}
    <p style="font-size: 15px; line-height: 1.7; color: #374151; margin: 20px 0 24px 0;">${outro}</p>
  `

  const secondaryNoteHtml = `
    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 14px; line-height: 1.7; color: #64748B; white-space: pre-line;">
      ${signature}
    </div>
  `

  const html = buildBrandEmailLayout(
    {
      locale,
      preheader,
      badgeText: badge,
      badgeType: 'gold',
      heading: title,
      contentHtml,
      ctaText: cta,
      ctaUrl: experiencesUrl,
      secondaryNoteHtml,
    },
    dict,
  )

  return { subject, body, html }
}
