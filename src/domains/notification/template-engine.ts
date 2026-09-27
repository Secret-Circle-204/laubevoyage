import { JsonTranslationDictionary } from '../translation/dictionary'
import { renderVerificationEmail } from './templates/verification-email'
import { renderWelcomeEmail } from './templates/welcome-email'
import { renderBookingConfirmationEmail } from './templates/booking-confirmation-email'
import { renderPaymentReceiptEmail } from './templates/payment-receipt-email'
import { renderTierUpgradedEmail } from './templates/tier-upgraded-email'
import { renderLoyaltyEarnedEmail } from './templates/loyalty-earned-email'
import { renderBookingPendingAdminReviewEmail } from './templates/booking-pending-admin-review-email'
import { renderAdminBnplReviewAlertEmail } from './templates/admin-bnpl-review-alert-email'

const dict = new JsonTranslationDictionary()

export interface RenderedTemplate {
  subject: string
  body: string
  html: string
}

type TemplateHandler = (
  templateData: Record<string, unknown>,
  locale: string,
  dictionary: JsonTranslationDictionary,
) => RenderedTemplate

const TEMPLATE_REGISTRY: Record<string, TemplateHandler> = {
  verification_email: renderVerificationEmail,
  welcome_email: renderWelcomeEmail,
  booking_confirmation: renderBookingConfirmationEmail,
  payment_receipt: renderPaymentReceiptEmail,
  tier_upgraded: renderTierUpgradedEmail,
  loyalty_earned: renderLoyaltyEarnedEmail,
  booking_pending_admin_review: renderBookingPendingAdminReviewEmail,
  admin_bnpl_review_alert: renderAdminBnplReviewAlertEmail,
}

/**
 * Enterprise Notification Template Engine
 * Central Coordinator / Registry / Facade.
 * Pure presentation renderer. Sourced strictly from resolved template data and SSOT dictionaries.
 * Free of deployment fallbacks, business calculations, or localization hardcoding.
 */
export class NotificationTemplateEngine {
  static renderTemplate(
    templateId: string,
    templateData: Record<string, unknown>,
    locale = 'en',
  ): RenderedTemplate {
    const handler = TEMPLATE_REGISTRY[templateId]
    if (!handler) {
      throw new Error(`[NotificationTemplateEngine] Unsupported or unhandled templateId: '${templateId}'`)
    }

    return handler(templateData, locale, dict)
  }
}
