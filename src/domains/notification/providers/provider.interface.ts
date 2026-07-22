import type { NotificationJobEntity } from '../types'

export interface NotificationDispatchResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface INotificationProvider {
  send(job: NotificationJobEntity): Promise<NotificationDispatchResult>
}
