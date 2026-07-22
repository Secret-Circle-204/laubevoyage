import type { INotificationProvider, NotificationDispatchResult } from './providers/provider.interface'
import { EmailNotificationAdapter } from './providers/email-adapter'
import { SMSNotificationAdapter } from './providers/sms-adapter'
import { PushNotificationAdapter } from './providers/push-adapter'
import { WhatsAppNotificationAdapter } from './providers/whatsapp-adapter'
import type { NotificationJobEntity, NotificationChannel } from './types'

/**
 * Central Notification Dispatcher
 * Resolves appropriate channel adapter and dispatches notifications.
 */
export class NotificationDispatcher {
  private adapters: Map<NotificationChannel, INotificationProvider> = new Map()

  constructor() {
    this.adapters.set('email', new EmailNotificationAdapter())
    this.adapters.set('sms', new SMSNotificationAdapter())
    this.adapters.set('push', new PushNotificationAdapter())
    this.adapters.set('whatsapp', new WhatsAppNotificationAdapter())
  }

  async dispatch(job: NotificationJobEntity): Promise<NotificationDispatchResult> {
    const adapter = this.adapters.get(job.channel)
    if (!adapter) {
      return {
        success: false,
        error: `[NotificationDispatcher] Unsupported notification channel: ${job.channel}`,
      }
    }

    return adapter.send(job)
  }
}
