import type { NotificationChannelPreferences } from './types'

/**
 * Preferences Manager Sub-Service
 * Manages notification channel preferences and localization settings.
 */
export class PreferencesManager {
  getDefaultNotificationPreferences(): NotificationChannelPreferences {
    return {
      marketing: { email: true, sms: false, push: true },
      booking: { email: true, sms: true, push: true },
      payment: { email: true, sms: true, push: true },
      loyalty: { email: true, sms: false, push: true },
    }
  }
}
