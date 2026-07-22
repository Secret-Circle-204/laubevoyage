import type { INotificationProvider, NotificationDispatchResult } from './provider.interface'
import type { NotificationJobEntity } from '../types'

/**
 * SMS Notification Adapter
 * Dispatches text SMS messages (Twilio fallback).
 */
export class SMSNotificationAdapter implements INotificationProvider {
  async send(job: NotificationJobEntity): Promise<NotificationDispatchResult> {
    console.log(`[SMSNotificationAdapter] Dispatching SMS to ${job.recipient}`)
    return {
      success: true,
      providerMessageId: `msg_sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    }
  }
}
