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

  // 1. Booking Reference Header Block
  const referenceBlockHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F5; border: 1px solid #E8E2D9; border-radius: 8px; margin-bottom: 24px;" dir="${dir}">
      <tr>
        <td style="padding: 14px 20px; text-align: ${textAlign};">
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8C827A;">
            ${bookingRefLabel}
          </span>
        </td>
        <td style="padding: 14px 20px; text-align: ${alignOpposite};">
          <span style="font-size: 15px; font-weight: 700; color: #1B1E4B; letter-spacing: 1px; font-family: 'Courier New', Courier, monospace;">
            ${bookingNumber}
          </span>
        </td>
      </tr>
    </table>
  `

  // 2. Journey Visual / Hero Card
  const heroVisualHtml = coverImageUrl
    ? `<img src="${coverImageUrl}" alt="${experienceTitle}" width="100%" style="display: block; max-width: 100%; border-radius: 8px; margin-bottom: 16px; object-fit: cover; max-height: 220px;" />`
    : `<div style="background: linear-gradient(135deg, #1B1E4B 0%, #2E3192 100%); border-radius: 8px; padding: 22px; color: #FFFFFF; text-align: center; margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #F58220; margin-bottom: 6px;">
          ${yourJourneyLabel}
        </div>
        <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; line-height: 1.3;">
          ${experienceTitle}
        </div>
      </div>`

  const journeyDetailsHtml = `
    <div style="margin-bottom: 28px;">
      ${heroVisualHtml}
      ${coverImageUrl ? `<h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: #1B1E4B; margin: 0 0 12px 0; text-align: ${textAlign};">${experienceTitle}</h2>` : ''}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #4B5563; line-height: 1.6;" dir="${dir}">
        <tr>
          <td style="padding: 4px 0; text-align: ${textAlign};" width="50%">
            <strong style="color: #1F2937;">📍 ${destinationLabel}:</strong> ${destinationName}
          </td>
          ${durationText ? `<td style="padding: 4px 0; text-align: ${alignOpposite};" width="50%"><strong style="color: #1F2937;">⏳ ${durationLabel}:</strong> ${durationText}</td>` : ''}
        </tr>
        ${travelDatesFormatted ? `<tr><td colspan="2" style="padding: 4px 0; text-align: ${textAlign};"><strong style="color: #1F2937;">🗓️ ${travelDatesLabel}:</strong> ${travelDatesFormatted}</td></tr>` : ''}
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
          <div style="padding: 10px 0; border-bottom: 1px solid #F1F5F9;">
            <div style="font-size: 14px; font-weight: 700; color: #1B1E4B;">${propName}</div>
            <div style="font-size: 13px; color: #64748B; margin-top: 2px;">
              ${nights > 0 ? dict.get(locale, 'emails.templates.bookingConfirmation.nights', { count: nights }) : ''}
              ${roomCat ? ` · ${roomCat}` : ''}
              ${board ? ` · ${board}` : ''}
            </div>
          </div>
        `
      })
      .join('')

    staysHtml = `
      <div style="margin-bottom: 28px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8C827A; margin-bottom: 8px; text-align: ${textAlign};">
          ${yourStayLabel}
        </div>
        ${stayRows}
      </div>
    `
  }

  // 4. Travelers Card (Privacy Preserved)
  const travelerNamesHtml =
    travelerNames.length > 0
      ? `<div style="font-size: 13px; color: #64748B; margin-top: 4px;">${travelerNames.join(' · ')}</div>`
      : ''

  const travelersHtml = `
    <div style="margin-bottom: 28px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8C827A; margin-bottom: 8px; text-align: ${textAlign};">
        ${travelersLabel}
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #1B1E4B;">
        ${travelersSummary}
      </div>
      ${travelerNamesHtml}
    </div>
  `

  // 5. Payment Summary Card (Dynamic Status)
  const paymentHtml = `
    <div style="margin-bottom: 28px; padding: 20px; background-color: #FAF8F5; border: 1px solid #E8E2D9; border-radius: 8px;" dir="${dir}">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="text-align: ${textAlign}; padding-bottom: 12px;">
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8C827A;">
              ${paymentLabel}
            </span>
          </td>
          <td style="text-align: ${alignOpposite}; padding-bottom: 12px;">
            <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-radius: 12px; background-color: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeBorder};">
              ${statusBadgeText}
            </span>
          </td>
        </tr>
      </table>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.8;">
        <tr>
          <td style="color: #64748B; text-align: ${textAlign};">${totalAmountLabel}</td>
          <td style="font-weight: 700; color: #1B1E4B; text-align: ${alignOpposite};">${formatMoney(totalAmount, currency)}</td>
        </tr>
        <tr>
          <td style="color: #64748B; text-align: ${textAlign};">${amountPaidLabel}</td>
          <td style="font-weight: 700; color: #047857; text-align: ${alignOpposite};">${formatMoney(amountPaid, currency)}</td>
        </tr>
        ${
          remainingBalance > 0
            ? `<tr>
                <td style="color: #64748B; text-align: ${textAlign};">${remainingBalanceLabel}</td>
                <td style="font-weight: 700; color: #B45309; text-align: ${alignOpposite};">${formatMoney(remainingBalance, currency)}</td>
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
      <div style="margin-bottom: 28px; padding: 14px 18px; background-color: #FFFDF9; border: 1px solid #F5E6D3; border-radius: 8px;" dir="${dir}">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #D97706; margin-bottom: 6px; text-align: ${textAlign};">
          💎 ${loyaltyRewardsLabel}
        </div>
        <div style="font-size: 13px; color: #78350F; text-align: ${textAlign};">
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
    <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #F1F5F9; font-size: 13px; line-height: 1.6; color: #64748B; text-align: ${textAlign};" dir="${dir}">
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
