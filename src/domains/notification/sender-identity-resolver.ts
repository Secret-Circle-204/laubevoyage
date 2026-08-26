import { systemSettingsRegistry } from '@/domains/system/settings-registry'
import type { NotificationCategory, SenderIdentity } from './types'

/**
 * Sender Identity Resolver
 * Resolves the administrator-configured Sender Identity from SystemSettings SSOT
 * based on the business responsibility / notification category.
 */
export class SenderIdentityResolver {
  static async resolve(category: NotificationCategory | string): Promise<SenderIdentity> {
    const settings = await systemSettingsRegistry.getSettings()
    const identities = settings.emailSenderSettings

    if (category === 'loyalty' || category === 'marketing') {
      return {
        fromName: identities.loyaltyIdentity.fromName,
        fromEmail: identities.loyaltyIdentity.fromEmail,
        replyTo: identities.loyaltyIdentity.replyTo,
      }
    }

    if (category === 'booking' || category === 'payment') {
      return {
        fromName: identities.reservationIdentity.fromName,
        fromEmail: identities.reservationIdentity.fromEmail,
        replyTo: identities.reservationIdentity.replyTo,
      }
    }

    if (category === 'security') {
      if (!identities.securityIdentity) {
        throw new Error(
          '[SenderIdentityResolver] Security sender identity is not configured in SystemSettings. Dispatch blocked.',
        )
      }
      return {
        fromName: identities.securityIdentity.fromName,
        fromEmail: identities.securityIdentity.fromEmail,
        replyTo: identities.securityIdentity.replyTo,
      }
    }

    throw new Error(
      `[SenderIdentityResolver] Unsupported or unmapped notification category: '${category}'. Failing fast.`,
    )
  }
}
