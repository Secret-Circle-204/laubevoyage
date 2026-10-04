import type { JsonTranslationDictionary } from '../../translation/dictionary'
import { buildBrandEmailLayout, getServerUrl } from '../email-layout'

function formatMoney(amount: number, currency: string): string {
  const normCurr = (currency || 'GBP').toUpperCase()
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  switch (normCurr) {
    case 'GBP':
      return `£${formatted}`
    case 'EUR':
      return `€${formatted}`
    case 'USD':
      return `$${formatted}`
    default:
      return `${formatted} ${normCurr}`
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function renderBookingConfirmationEmail(
  templateData: Record<string, unknown>,
  locale: string,
  dict: JsonTranslationDictionary,
): { subject: string; body: string; html: string } {
  if (!templateData['bookingNumber']) {
    throw new Error(
      `[NotificationTemplateEngine] Template 'booking_confirmation' missing required field: bookingNumber`,
    )
  }
  if (!templateData['customerName']) {
    throw new Error(
      `[NotificationTemplateEngine] Template 'booking_confirmation' missing required field: customerName`,
    )
  }

  const isArabic = locale.toLowerCase().startsWith('ar')
  const dir = isArabic ? 'rtl' : 'ltr'
  const textAlign = isArabic ? 'right' : 'left'
  const alignOpposite = isArabic ? 'left' : 'right'

  const bookingNumber = String(templateData['bookingNumber'])
  const customerName = String(templateData['customerName'])
  const currency = String(templateData['currency'] || 'GBP')

  const subject = dict.get(locale, 'emails.templates.bookingConfirmation.subject', { bookingNumber })
  const preheader = dict.get(locale, 'emails.templates.bookingConfirmation.preheader')
  const badgeText = dict.get(locale, 'emails.templates.bookingConfirmation.badge')

  // Labels from dictionary
  const bookingRefLabel = dict.get(locale, 'emails.templates.bookingConfirmation.bookingReference')
  const yourJourneyLabel = dict.get(locale, 'emails.templates.bookingConfirmation.journeySummary')
  const travelDatesLabel = dict.get(locale, 'emails.templates.bookingConfirmation.travelDates')
  const durationLabel = dict.get(locale, 'emails.templates.bookingConfirmation.duration')
  const destinationLabel = dict.get(locale, 'emails.templates.bookingConfirmation.destination')
  const yourStayLabel = dict.get(locale, 'emails.templates.bookingConfirmation.yourStay')
  const travelersLabel = dict.get(locale, 'emails.templates.bookingConfirmation.travelers')
  const paymentLabel = dict.get(locale, 'emails.templates.bookingConfirmation.payment')
  const totalAmountLabel = dict.get(locale, 'emails.templates.bookingConfirmation.totalAmount')
  const amountPaidLabel = dict.get(locale, 'emails.templates.bookingConfirmation.amountPaid')
  const remainingBalanceLabel = dict.get(locale, 'emails.templates.bookingConfirmation.remainingBalance')
  const loyaltyRewardsLabel = dict.get(locale, 'emails.templates.bookingConfirmation.loyaltyRewards')
  const ctaText = dict.get(locale, 'emails.templates.bookingConfirmation.cta')
  const supportNote = dict.get(locale, 'emails.templates.bookingConfirmation.supportNote')

  // Journey details
  const experienceTitle = String(templateData['experienceTitle'] || 'Bespoke Journey')
  const destinationName = String(templateData['destinationName'] || 'Egypt')
  const durationText = String(templateData['durationText'] || '')
  const coverImageUrl = templateData['coverImageUrl'] ? String(templateData['coverImageUrl']) : undefined

  const startDateFormatted = formatDate(templateData['startDate'] as string)
  const endDateFormatted = formatDate(templateData['endDate'] as string)
  const travelDatesFormatted =
    startDateFormatted && endDateFormatted
      ? `${startDateFormatted} — ${endDateFormatted}`
      : startDateFormatted || endDateFormatted || ''

  // Stay / Accommodation details
  const stays = Array.isArray(templateData['stays'])
    ? (templateData['stays'] as Array<Record<string, unknown>>)
    : []

  // Travelers
  const adultsCount = Number(templateData['adultsCount'] || templateData['travelersCount'] || 1)
  const defaultTravelersText = dict.get(locale, 'emails.templates.bookingConfirmation.adultsCount', { count: adultsCount })
  const travelersSummary =
    templateData['travelersSummary'] && !String(templateData['travelersSummary']).endsWith('Adults')
      ? String(templateData['travelersSummary'])
      : defaultTravelersText
  const travelerNames = Array.isArray(templateData['travelerNames'])
    ? (templateData['travelerNames'] as string[])
    : []

  // Financial status (Dynamic resolution)
  const totalAmount = Number(templateData['totalAmount'] ?? 0)
  const amountPaid = Number(templateData['amountPaid'] ?? 0)
  const remainingBalance = Number(templateData['remainingBalance'] ?? 0)
  const financialStatus = String(templateData['financialStatus'] || 'paid_in_full')

  let statusBadgeText = dict.get(locale, 'emails.templates.bookingConfirmation.paidInFull')
  let statusBadgeBg = '#ECFDF5'
  let statusBadgeColor = '#047857'
  let statusBadgeBorder = '#A7F3D0'

  if (financialStatus === 'deposit_paid') {
    statusBadgeText = dict.get(locale, 'emails.templates.bookingConfirmation.depositPaid')
    statusBadgeBg = '#FFFBEB'
    statusBadgeColor = '#B45309'
    statusBadgeBorder = '#FDE68A'
  } else if (financialStatus === 'pending') {
    statusBadgeText = dict.get(locale, 'emails.templates.bookingConfirmation.paymentPending')
    statusBadgeBg = '#FFF7ED'
    statusBadgeColor = '#C2410C'
    statusBadgeBorder = '#FED7AA'
  }

  // Loyalty redemption (points used only)
  const pointsUsed = Number(templateData['pointsUsed'] ?? 0)
  const pointsDiscount = Number(templateData['pointsDiscount'] ?? 0)

  // CTA Link
  const serverUrl = getServerUrl()
  const ctaUrl = String(
    templateData['ctaUrl'] || `${serverUrl}/booking/confirmation/${bookingNumber}`,
  )

  const fontStack = isArabic
    ? `'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, -apple-system, Arial, sans-serif`
    : `'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

  const headingFont = isArabic
    ? `'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif`
    : `'Playfair Display', Georgia, Cambria, 'Times New Roman', serif`

  // 1. Booking Reference Header Block
  const referenceBlockHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF9F7; border: 1px solid #EAE7DF; border-radius: 4px; margin-bottom: 28px;" dir="${dir}">
      <tr>
        <td style="padding: 14px 20px; text-align: ${textAlign};">
          <span style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8C8479; font-family: ${fontStack};">
            ${bookingRefLabel}
          </span>
        </td>
        <td style="padding: 14px 20px; text-align: ${alignOpposite};">
          <span style="font-size: 14px; font-weight: 700; color: #0C101C; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            ${bookingNumber}
          </span>
        </td>
      </tr>
    </table>
  `

  // 2. Journey Visual / Hero Card
  const heroVisualHtml = coverImageUrl
    ? `<img src="${coverImageUrl}" alt="${experienceTitle}" width="100%" style="display: block; max-width: 100%; border-radius: 6px; border: 1px solid #EAE8E2; margin-bottom: 18px; object-fit: cover; max-height: 240px;" />`
    : `<div style="background: linear-gradient(135deg, #1B1E4B 0%, #2E3192 100%); border-radius: 6px; padding: 26px 24px; color: #FFFFFF; text-align: center; margin-bottom: 18px;">
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #C5A880; margin-bottom: 8px;">
          ${yourJourneyLabel}
        </div>
        <div style="font-family: ${headingFont}; font-size: 20px; font-weight: 700; line-height: 1.35; color: #FFFFFF;">
          ${experienceTitle}
        </div>
      </div>`

  const journeyDetailsHtml = `
    <div style="margin-bottom: 30px;">
      ${heroVisualHtml}
      ${coverImageUrl ? `<h2 style="font-family: ${headingFont}; font-size: 20px; font-weight: 700; color: #0C101C; margin: 0 0 14px 0; text-align: ${textAlign}; letter-spacing: -0.2px;">${experienceTitle}</h2>` : ''}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #374151; line-height: 1.6; border-collapse: collapse;" dir="${dir}">
        <tr>
          <td style="padding: 6px 0; text-align: ${textAlign}; vertical-align: top;" width="50%">
            <span style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8C8479; display: block; margin-bottom: 2px;">${destinationLabel}</span>
            <span style="font-size: 14px; font-weight: 600; color: #0C101C;">${destinationName}</span>
          </td>
          ${durationText ? `
          <td style="padding: 6px 0; text-align: ${alignOpposite}; vertical-align: top;" width="50%">
            <span style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8C8479; display: block; margin-bottom: 2px;">${durationLabel}</span>
            <span style="font-size: 14px; font-weight: 600; color: #0C101C;">${durationText}</span>
          </td>` : ''}
        </tr>
        ${travelDatesFormatted ? `
        <tr>
          <td colspan="2" style="padding: 10px 0 4px 0; text-align: ${textAlign}; border-top: 1px solid #F3F2EE;">
            <span style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8C8479; display: block; margin-bottom: 2px;">${travelDatesLabel}</span>
            <span style="font-size: 14px; font-weight: 600; color: #0C101C;">${travelDatesFormatted}</span>
          </td>
        </tr>` : ''}
      </table>
    </div>
  `

  // 3. Stays / Accommodation Card
  let staysHtml = ''
  if (stays.length > 0) {
    const stayRows = stays
      .map((stay) => {
        const propName = String(stay['propertyName'] || '')
        const nights = Number(stay['nights'] || 0)
        const roomCat = stay['roomCategory'] ? String(stay['roomCategory']) : ''
        const board = stay['boardBasis'] ? String(stay['boardBasis']).replace(/_/g, ' ') : ''

        return `
          <div style="padding: 10px 0; border-bottom: 1px solid #F3F2EE;">
            <div style="font-size: 14px; font-weight: 700; color: #0C101C;">${propName}</div>
            <div style="font-size: 13px; color: #525866; margin-top: 3px;">
              ${nights > 0 ? dict.get(locale, 'emails.templates.bookingConfirmation.nights', { count: nights }) : ''}
              ${roomCat ? ` · ${roomCat}` : ''}
              ${board ? ` · ${board}` : ''}
            </div>
          </div>
        `
      })
      .join('')

    staysHtml = `
      <div style="margin-bottom: 30px; padding-top: 20px; border-top: 1px solid #ECE7DE;">
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8C8479; margin-bottom: 12px; text-align: ${textAlign};">
          ${yourStayLabel}
        </div>
        ${stayRows}
      </div>
    `
  }

  // 4. Travelers Card (Privacy Preserved)
  const travelerNamesHtml =
    travelerNames.length > 0
      ? `<div style="font-size: 13px; color: #525866; margin-top: 4px;">${travelerNames.join(' · ')}</div>`
      : ''

  const travelersHtml = `
    <div style="margin-bottom: 30px; padding-top: 20px; border-top: 1px solid #ECE7DE;">
      <div style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8C8479; margin-bottom: 10px; text-align: ${textAlign};">
        ${travelersLabel}
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #0C101C;">
        ${travelersSummary}
      </div>
      ${travelerNamesHtml}
    </div>
  `

  // 5. Payment Summary Card (Dynamic Status)
  const paymentHtml = `
    <div style="margin-bottom: 30px; padding: 22px 24px; background-color: #FAF9F7; border: 1px solid #EAE7DF; border-radius: 6px;" dir="${dir}">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="text-align: ${textAlign}; padding-bottom: 14px;">
            <span style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8C8479;">
              ${paymentLabel}
            </span>
          </td>
          <td style="text-align: ${alignOpposite}; padding-bottom: 14px;">
            <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-radius: 3px; background-color: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeBorder}; font-family: ${fontStack};">
              ${statusBadgeText}
            </span>
          </td>
        </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.8;">
        <tr>
          <td style="color: #525866; text-align: ${textAlign}; padding: 3px 0;">${totalAmountLabel}</td>
          <td style="font-weight: 700; color: #0C101C; text-align: ${alignOpposite}; padding: 3px 0;">${formatMoney(totalAmount, currency)}</td>
        </tr>
        <tr>
          <td style="color: #525866; text-align: ${textAlign}; padding: 3px 0;">${amountPaidLabel}</td>
          <td style="font-weight: 700; color: #047857; text-align: ${alignOpposite}; padding: 3px 0;">${formatMoney(amountPaid, currency)}</td>
        </tr>
        ${
          remainingBalance > 0
            ? `<tr>
                <td style="color: #525866; text-align: ${textAlign}; padding: 3px 0;">${remainingBalanceLabel}</td>
                <td style="font-weight: 700; color: #92400E; text-align: ${alignOpposite}; padding: 3px 0;">${formatMoney(remainingBalance, currency)}</td>
              </tr>`
            : ''
        }
      </table>
    </div>
  `

  // 6. Loyalty Rewards Card (Only rendered if points were used)
  let loyaltyHtml = ''
  if (pointsUsed > 0) {
    const pointsUsedText = dict.get(locale, 'emails.templates.bookingConfirmation.pointsUsed', {
      points: pointsUsed,
    })
    const creditAppliedText = dict.get(
      locale,
      'emails.templates.bookingConfirmation.creditApplied',
      { amount: formatMoney(pointsDiscount, currency) },
    )

    loyaltyHtml = `
      <div style="margin-bottom: 30px; padding: 16px 20px; background-color: #FAF7F0; border: 1px solid #EADBCA; border-radius: 6px;" dir="${dir}">
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8F6B2C; margin-bottom: 6px; text-align: ${textAlign};">
          ${loyaltyRewardsLabel}
        </div>
        <div style="font-size: 13px; color: #6D4C17; text-align: ${textAlign}; line-height: 1.5;">
          <strong>${pointsUsedText}</strong> · ${creditAppliedText}
        </div>
      </div>
    `
  }

  // Combine full content HTML
  const contentHtml = `
    ${referenceBlockHtml}
    ${journeyDetailsHtml}
    ${staysHtml}
    ${travelersHtml}
    ${paymentHtml}
    ${loyaltyHtml}
  `

  const secondaryNoteHtml = `
    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #ECE7DE; font-size: 13px; line-height: 1.7; color: #6B7280; text-align: ${textAlign};" dir="${dir}">
      ${supportNote}
    </div>
  `

  const html = buildBrandEmailLayout(
    {
      locale,
      preheader,
      badgeText,
      badgeType: 'primary',
      heading: subject,
      contentHtml,
      ctaText,
      ctaUrl,
      secondaryNoteHtml,
    },
    dict,
  )

  // Plain text fallback
  const body = [
    `L'AUBE VOYAGE`,
    `${badgeText}`,
    `${bookingRefLabel}: ${bookingNumber}`,
    ``,
    `YOUR JOURNEY:`,
    `${experienceTitle}`,
    `${destinationLabel}: ${destinationName}`,
    travelDatesFormatted ? `${travelDatesLabel}: ${travelDatesFormatted}` : '',
    durationText ? `${durationLabel}: ${durationText}` : '',
    ``,
    `TRAVELERS:`,
    travelersSummary,
    travelerNames.length > 0 ? travelerNames.join(', ') : '',
    ``,
    `PAYMENT:`,
    `${totalAmountLabel}: ${formatMoney(totalAmount, currency)}`,
    `${amountPaidLabel}: ${formatMoney(amountPaid, currency)}`,
    remainingBalance > 0 ? `${remainingBalanceLabel}: ${formatMoney(remainingBalance, currency)}` : '',
    `Status: ${statusBadgeText}`,
    ``,
    pointsUsed > 0 ? `LOYALTY: ${pointsUsed} points used (${formatMoney(pointsDiscount, currency)} credit)` : '',
    ``,
    `${ctaText}: ${ctaUrl}`,
    ``,
    supportNote,
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, body, html }
}
