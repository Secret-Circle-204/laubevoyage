import type { NotificationJobEntity, SenderIdentity } from '../types'

export interface NotificationDispatchResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface INotificationProvider {
  send(job: NotificationJobEntity, sender?: SenderIdentity): Promise<NotificationDispatchResult>
}
