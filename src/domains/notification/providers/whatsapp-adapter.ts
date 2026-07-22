import type { INotificationProvider, NotificationDispatchResult } from './provider.interface'
import type { NotificationJobEntity } from '../types'

export class WhatsAppNotificationAdapter implements INotificationProvider {
  async send(job: NotificationJobEntity): Promise<NotificationDispatchResult> {
    console.log(`[WhatsAppNotificationAdapter] Dispatching WhatsApp message to ${job.recipient}`)
    return {
      success: true,
      providerMessageId: `msg_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    }
  }
}
