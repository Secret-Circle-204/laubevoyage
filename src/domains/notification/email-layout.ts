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
    ? `'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, -apple-system, Arial, sans-serif`
    : `'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

  const headingFont = isArabic
    ? `'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif`
    : `'Playfair Display', Georgia, Cambria, 'Times New Roman', serif`

  let badgeBg = '#F1F4F9'
  let badgeColor = '#162447'
  let badgeBorder = '#D5DEEC'

  if (options.badgeType === 'gold') {
    badgeBg = '#FAF6ED'
    badgeColor = '#8F6B2C'
    badgeBorder = '#ECD8B3'
  } else if (options.badgeType === 'primary') {
    badgeBg = '#F1F4F9'
    badgeColor = '#162447'
    badgeBorder = '#D5DEEC'
  } else if (options.badgeType === 'security') {
    badgeBg = '#F3F4F6'
    badgeColor = '#374151'
    badgeBorder = '#E5E7EB'
  }

  const badgeHtml = options.badgeText
    ? `<tr><td style="padding: 0 0 18px 0; text-align: ${textAlign};"><span style="display: inline-block; padding: 5px 14px; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-radius: 3px; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-family: ${fontStack};">${options.badgeText}</span></td></tr>`
    : ''

  const ctaHtml = (options.ctaText && options.ctaUrl)
    ? `<table border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0 24px 0; width: 100%;">
        <tr>
          <td align="${isArabic ? 'right' : 'left'}">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 4px; background-color: #0C101C;">
                  <a href="${options.ctaUrl}" target="_blank" style="font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 16px 36px; border-radius: 4px; display: inline-block; letter-spacing: 1.2px; text-transform: uppercase; font-family: ${fontStack};">
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
    @media only screen and (max-width: 640px) {
      .email-container { width: 100% !important; padding: 0 !important; }
      .email-card { padding: 32px 20px !important; }
      .email-header { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F7F5; width: 100% !important; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text -->
  <span style="display:none;font-size:1px;color:#F7F7F5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${options.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </span>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F7F7F5; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 44px 16px;">
        <!-- Container Table -->
        <table border="0" cellpadding="0" cellspacing="0" width="620" class="email-container" style="max-width: 620px; width: 100%; margin: 0 auto;">
          <!-- Top Architectural Accent Line: Brushed Champagne Gold -->
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #9A7B4F 0%, #C5A880 50%, #9A7B4F 100%); background-color: #C5A880; line-height: 3px; font-size: 3px; border-radius: 6px 6px 0 0;">&nbsp;</td>
          </tr>

          <!-- Header / Brand Banner -->
          <tr>
            <td align="center" class="email-header" style="background-color: #0C101C; padding: 36px 24px; text-align: center; border-bottom: 1px solid #1E2538;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="${logoUrl}" alt="L'Aube Voyage" width="190" style="display: block; max-width: 190px; width: 190px; height: auto; border: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 2px; text-align: center;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card Body -->
          <tr>
            <td class="email-card" style="background-color: #FFFFFF; padding: 44px 38px; border: 1px solid #EAE8E2; border-top: none; border-radius: 0 0 8px 8px; text-align: ${textAlign};" dir="${dir}">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                ${badgeHtml}
                <tr>
                  <td style="padding: 0 0 22px 0;">
                    <h1 style="font-family: ${headingFont}; font-size: 24px; font-weight: 700; color: #0C101C; line-height: 1.35; margin: 0; letter-spacing: -0.2px;">
                      ${options.heading}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: ${fontStack}; color: #2C3442; font-size: 15px; line-height: 1.7;">
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
            <td style="padding: 36px 20px 24px 20px; text-align: center; font-family: ${fontStack}; font-size: 12px; line-height: 1.8; color: #888E99;" dir="${dir}">
              <div style="font-weight: 600; color: #525866; letter-spacing: 1px; text-transform: uppercase; font-size: 11px; margin-bottom: 8px;">
                ${footerTagline}
              </div>
              <div style="margin-bottom: 6px; color: #888E99;">
                ${footerRights}
              </div>
              <div style="color: #A3A8B3; font-size: 11px;">
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
