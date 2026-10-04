import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout } from '../email-layout'

function getServerUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SERVER_URL
  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }
  return 'https://laubevoyage.com'
}

export function renderLoyaltyEarnedEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  const isArabic = locale === 'ar'
  const dir = isArabic ? 'rtl' : 'ltr'
  const textAlign = isArabic ? 'right' : 'left'
  const alignOpposite = isArabic ? 'left' : 'right'

  const points = Number(templateData['points'] ?? 0)
  const balance = templateData['balance'] !== undefined ? Number(templateData['balance']) : undefined
  const bookingNumber = templateData['bookingNumber'] ? String(templateData['bookingNumber']) : undefined
  const customerName = String(templateData['customerName'] || (isArabic ? 'عضو دائرة لو أوب' : 'Valued Member'))
  const monetaryValueFormatted = templateData['monetaryValueFormatted']
    ? String(templateData['monetaryValueFormatted'])
    : undefined

  const serverUrl = getServerUrl()
  const ctaUrl = String(templateData['ctaUrl'] || `${serverUrl}/dashboard/loyalty`)

  // Localized texts with graceful fallbacks
  const subject = dict.get(locale, 'emails.templates.loyaltyEarned.subject', {
    points: points.toLocaleString(),
  }) || (isArabic ? `تمت إضافة نقاط مكافآت الرحلة: +${points.toLocaleString()} نقطة ولاء` : `Voyage Rewards Credited: +${points.toLocaleString()} Loyalty Points`)

  const badgeText = dict.get(locale, 'emails.templates.loyaltyEarned.badge') || (isArabic ? 'مكافآت العضوية' : 'LOYALTY REWARDS')
  const greeting = dict.get(locale, 'emails.templates.loyaltyEarned.greeting', { customerName }) || (isArabic ? `عزيزنا ${customerName}،` : `Dear ${customerName},`)

  const introText = bookingNumber
    ? (dict.get(locale, 'emails.templates.loyaltyEarned.introWithBooking', { bookingNumber }) ||
        (isArabic
          ? `يسعدنا تأكيد أن حجز رحلتك الأخير (رقم #${bookingNumber}) قد أضاف مكافآت حصرية إلى محفظة عضويتك لدى دائرة لو أوب فوياج.`
          : `We are pleased to confirm that your recent journey reservation (#${bookingNumber}) has unlocked exclusive rewards within the L'Aube Voyage Circle.`))
    : (dict.get(locale, 'emails.templates.loyaltyEarned.introGeneral') ||
        (isArabic
          ? `يسعدنا تأكيد إضافة مكافآت ولاء جديدة إلى حسابك في دائرة لو أوب فوياج.`
          : `We are pleased to confirm that new loyalty rewards have been credited to your L'Aube Voyage Circle account.`))

  const pointsEarnedLabel = dict.get(locale, 'emails.templates.loyaltyEarned.pointsEarnedLabel') || (isArabic ? 'النقاط المكتسبة' : 'POINTS CREDITED')
  const currentBalanceLabel = dict.get(locale, 'emails.templates.loyaltyEarned.currentBalanceLabel') || (isArabic ? 'رصيد النقاط الكلي' : 'NEW AVAILABLE BALANCE')
  const monetaryValueLabel = dict.get(locale, 'emails.templates.loyaltyEarned.monetaryValueLabel') || (isArabic ? 'القيمة التقديرية للمزايا' : 'ESTIMATED PRIVILEGE VALUE')
  const bookingRefLabel = dict.get(locale, 'emails.templates.loyaltyEarned.bookingRefLabel') || (isArabic ? 'رقم الحجز المرجعي' : 'RESERVATION REFERENCE')
  const editorialText = dict.get(locale, 'emails.templates.loyaltyEarned.editorialText') || (isArabic
    ? 'كل رحلة مع لو أوب فوياج ترتقي بمكانة عضويتك وتفتح لك آفاقاً أوسع من الامتيازات الرفيعة. يمكنك استخدام نقاطك في ترقية الإقامات والرحلات الاستكشافية الخاصة.'
    : 'Every expedition with L\'Aube Voyage deepens your travel standing. Your accumulated rewards may be redeemed towards bespoke itinerary customization, suite privileges, and private sanctuaries on future journeys.')
  const ctaText = dict.get(locale, 'emails.templates.loyaltyEarned.ctaText') || (isArabic ? 'استكشف محفظة المكافآت ←' : 'Access Rewards Vault →')
  const supportNote = dict.get(locale, 'emails.templates.loyaltyEarned.supportNote') || (isArabic
    ? 'نقاطك محفوظة بأمان في محفظة عضويتك. للاستفسار أو طلب ترقية خاصة لرحلتك القادمة، فريق الكونسيرج الخاص في خدمتك دائماً.'
    : 'Your points are securely stored in your Member Vault. For inquiries or bespoke redemptions, our Private Client Concierge remains at your service.')

  const headingFont = isArabic
    ? `'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif`
    : `'Playfair Display', Georgia, Cambria, 'Times New Roman', serif`

  const fontStack = isArabic
    ? `'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif`
    : `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

  // 1. Booking Reference strip (if booking-linked)
  const bookingRefHtml = bookingNumber
    ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF9F7; border: 1px solid #EAE7DF; border-radius: 4px; margin-bottom: 24px;" dir="${dir}">
        <tr>
          <td style="padding: 12px 18px; text-align: ${textAlign};">
            <span style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8C8479; font-family: ${fontStack};">
              ${bookingRefLabel}
            </span>
          </td>
          <td style="padding: 12px 18px; text-align: ${alignOpposite};">
            <span style="font-size: 13px; font-weight: 700; color: #0C101C; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              #${bookingNumber}
            </span>
          </td>
        </tr>
      </table>
    `
    : ''

  // 2. Obsidian Rewards Hero Card
  const pointsFormatted = `+${points.toLocaleString()}`
  const balanceFormatted = balance !== undefined ? `${balance.toLocaleString()} ${isArabic ? 'نقطة' : 'Pts'}` : ''

  const monetaryRowHtml = monetaryValueFormatted
    ? `
      <tr>
        <td style="padding-top: 14px; text-align: ${textAlign}; border-top: 1px solid #232B3E;">
          <span style="font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #A0988A; display: block; margin-bottom: 4px;">
            ${monetaryValueLabel}
          </span>
          <span style="font-size: 15px; font-weight: 600; color: #E8E5DF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${monetaryValueFormatted}
          </span>
        </td>
      </tr>
    `
    : ''

  const balanceRowHtml = balance !== undefined
    ? `
      <tr>
        <td style="padding-top: 14px; text-align: ${textAlign}; border-top: 1px solid #232B3E;">
          <span style="font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #A0988A; display: block; margin-bottom: 4px;">
            ${currentBalanceLabel}
          </span>
          <span style="font-size: 16px; font-weight: 700; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${balanceFormatted}
          </span>
        </td>
      </tr>
    `
    : ''

  const rewardsCardHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0C101C; border-radius: 8px; border: 1px solid #1C2333; margin-bottom: 28px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);" dir="${dir}">
      <tr>
        <td style="padding: 26px 24px; text-align: ${textAlign};">
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #C5A880; margin-bottom: 10px; font-family: ${fontStack};">
            ${pointsEarnedLabel}
          </div>
          <div style="font-size: 34px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <span style="color: #C5A880;">${pointsFormatted}</span>
            <span style="font-size: 16px; font-weight: 500; color: #A0988A; margin-${isArabic ? 'right' : 'left'}: 8px;">${isArabic ? 'نقطة ولاء' : 'Loyalty Points'}</span>
          </div>
        </td>
      </tr>
      ${(balanceRowHtml || monetaryRowHtml) ? `
      <tr>
        <td style="padding: 0 24px 22px 24px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            ${balanceRowHtml}
            ${monetaryRowHtml}
          </table>
        </td>
      </tr>
      ` : ''}
    </table>
  `

  // 3. Editorial & Marketing Narrative
  const editorialBlockHtml = `
    <div style="margin-bottom: 28px;">
      <p style="font-size: 14px; line-height: 1.75; color: #4A5568; margin: 0 0 14px 0; text-align: ${textAlign};">
        ${editorialText}
      </p>
      <p style="font-size: 12px; line-height: 1.7; color: #718096; margin: 0; text-align: ${textAlign}; border-${isArabic ? 'right' : 'left'}: 2px solid #C5A880; padding-${isArabic ? 'right' : 'left'}: 12px;">
        ${supportNote}
      </p>
    </div>
  `

  // 4. Action Button
  const ctaButtonHtml = `
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="${ctaUrl}" style="display: inline-block; background-color: #0C101C; color: #FFFFFF; font-family: ${fontStack}; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 4px; border: 1px solid #C5A880;">
        ${ctaText}
      </a>
    </div>
  `

  const contentHtml = `
    <div style="font-family: ${fontStack};">
      <div style="margin-bottom: 20px;">
        <h2 style="font-family: ${headingFont}; font-size: 18px; font-weight: 700; color: #0C101C; margin: 0 0 8px 0; text-align: ${textAlign};">
          ${greeting}
        </h2>
        <p style="font-size: 14px; line-height: 1.7; color: #374151; margin: 0; text-align: ${textAlign};">
          ${introText}
        </p>
      </div>

      ${bookingRefHtml}
      ${rewardsCardHtml}
      ${editorialBlockHtml}
      ${ctaButtonHtml}
    </div>
  `

  const html = buildBrandEmailLayout(
    {
      locale,
      preheader: subject,
      badgeText,
      badgeType: 'gold',
      heading: isArabic ? 'مكافآت الرحلة المعتمدة' : 'Voyage Rewards Credited',
      contentHtml,
    },
    dict,
  )

  const body = `${greeting}\n\n${introText}\n\n${pointsEarnedLabel}: ${pointsFormatted} Points\n${balance !== undefined ? `${currentBalanceLabel}: ${balanceFormatted}\n` : ''}${monetaryValueFormatted ? `${monetaryValueLabel}: ${monetaryValueFormatted}\n` : ''}\n${editorialText}\n\n${ctaText}: ${ctaUrl}`

  return { subject, body, html }
}

