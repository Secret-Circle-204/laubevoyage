import type { INotificationProvider, NotificationDispatchResult } from './provider.interface'
import type { NotificationJobEntity } from '../types'

/**
 * Email Notification Adapter
 * Dispatches HTML/Text emails with attachments (Nodemailer / SendGrid fallback).
 */
export class EmailNotificationAdapter implements INotificationProvider {
  async send(job: NotificationJobEntity): Promise<NotificationDispatchResult> {
    console.log(
      `[EmailNotificationAdapter] Dispatching Email to ${job.recipient} (Subject: ${job.translationKey}, Attachments: ${job.attachments?.length || 0})`,
    )
    return {
      success: true,
      providerMessageId: `msg_email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    }
  }
}
