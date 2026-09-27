import type { JsonTranslationDictionary } from '../translation/dictionary'

/**
 * Fail-fast server URL resolver.
 * Enforces authoritative NEXT_PUBLIC_SERVER_URL environment configuration.
 * Throws immediately if missing to prevent silent fallback or environment bleed.
 */
export function getServerUrl(): string {
  const url = process.env.NEXT_PUBLIC_SERVER_URL?.trim().replace(/\/$/, '')
  if (!url) {
    throw new Error('[NotificationTemplateEngine] NEXT_PUBLIC_SERVER_URL environment variable is required.')
  }
  return url
}

export interface EmailLayoutOptions {
  locale: string
  preheader: string
  badgeText?: string
  badgeType?: 'primary' | 'gold' | 'security'
  heading: string
  contentHtml: string
  ctaText?: string
  ctaUrl?: string
  secondaryNoteHtml?: string
}

/**
 * Branded Responsive Email Layout
 * Centralized presentation layout for all L'Aube Voyage transactional emails.
 * Safe table-based layout compatible with major email clients (Gmail, Outlook, Apple Mail).
 * Supports RTL/LTR bidirectional presentation and graceful image-disabled rendering.
 */
export function buildBrandEmailLayout(
  options: EmailLayoutOptions,
  dict: JsonTranslationDictionary,
): string {
  const isArabic = options.locale.toLowerCase().startsWith('ar')
  const dir = isArabic ? 'rtl' : 'ltr'
  const textAlign = isArabic ? 'right' : 'left'
  const serverUrl = getServerUrl()
  const logoUrl = `${serverUrl}/logos/LAube-Voyage-logo-horizontal-colors-and-white.svg`

  const fontStack = isArabic
    ? `'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif`
    : `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

  const headingFont = isArabic
    ? `'Segoe UI', Tahoma, Arial, sans-serif`
    : `'Playfair Display', Georgia, Cambria, 'Times New Roman', serif`

  let badgeBg = '#EEF2FF'
  let badgeColor = '#2E3192'
  let badgeBorder = '#C7D2FE'
  if (options.badgeType === 'gold') {
    badgeBg = '#FFFBEB'
    badgeColor = '#B45309'
    badgeBorder = '#FDE68A'
  } else if (options.badgeType === 'primary') {
    badgeBg = '#F0F9FF'
    badgeColor = '#0284C7'
    badgeBorder = '#BAE6FD'
  }

  const badgeHtml = options.badgeText
    ? `<tr><td style="padding: 0 0 16px 0;"><span style="display: inline-block; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 20px; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">${options.badgeText}</span></td></tr>`
    : ''

  const ctaHtml = (options.ctaText && options.ctaUrl)
    ? `<table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0; width: 100%;">
        <tr>
          <td align="${isArabic ? 'right' : 'left'}">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 8px; background-color: #2E3192;">
                  <a href="${options.ctaUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 14px 34px; border-radius: 8px; display: inline-block; letter-spacing: 0.5px; font-family: ${fontStack};">
                    ${options.ctaText}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : ''

  const footerTagline = dict.get(options.locale, 'layout.footer.tagline')
  const footerRights = dict.get(options.locale, 'layout.footer.rights')
  const footerSupport = dict.get(options.locale, 'emails.footer.support')

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${options.locale}" dir="${dir}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${options.heading}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 0 !important; }
      .email-card { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F5F7; width: 100% !important; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text -->
  <span style="display:none;font-size:1px;color:#F4F5F7;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${options.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </span>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F5F7; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Container Table -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; width: 100%; margin: 0 auto;">
          <!-- Top Accent Line -->
          <tr>
            <td height="4" style="background-color: #F58220; line-height: 4px; font-size: 4px; border-radius: 8px 8px 0 0;">&nbsp;</td>
          </tr>

          <!-- Header / Brand Banner -->
          <tr>
            <td align="center" style="background-color: #1B1E4B; padding: 32px 24px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="${logoUrl}" alt="L'Aube Voyage" width="180" style="display: block; max-width: 180px; width: 180px; height: auto; border: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 1.5px; text-align: center;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card Body -->
          <tr>
            <td class="email-card" style="background-color: #FFFFFF; padding: 40px 36px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 10px 10px; text-align: ${textAlign};" dir="${dir}">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                ${badgeHtml}
                <tr>
                  <td style="padding: 0 0 18px 0;">
                    <h1 style="font-family: ${headingFont}; font-size: 24px; font-weight: 700; color: #1B1E4B; line-height: 1.3; margin: 0;">
                      ${options.heading}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: ${fontStack}; color: #374151;">
                    ${options.contentHtml}
                    ${ctaHtml}
                    ${options.secondaryNoteHtml || ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center; font-family: ${fontStack}; font-size: 12px; line-height: 1.8; color: #9CA3AF;" dir="${dir}">
              <div style="font-weight: 600; color: #6B7280; letter-spacing: 0.5px; margin-bottom: 6px;">
                ${footerTagline}
              </div>
              <div style="margin-bottom: 6px;">
                ${footerRights}
              </div>
              <div>
                ${footerSupport}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
