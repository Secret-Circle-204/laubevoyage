import type { INotificationProvider, NotificationDispatchResult } from './provider.interface'
import type { NotificationJobEntity } from '../types'

export class PushNotificationAdapter implements INotificationProvider {
  async send(job: NotificationJobEntity): Promise<NotificationDispatchResult> {
    console.log(`[PushNotificationAdapter] Dispatching Push Notification to ${job.recipient}`)
    return {
      success: true,
      providerMessageId: `msg_push_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    }
  }
}
