import type { NotificationJobEntity } from '../types'
import type { NotificationDispatchResult } from '../providers/provider.interface'

export interface IEmailProvider {
  readonly providerId: string
  sendEmail(job: NotificationJobEntity): Promise<NotificationDispatchResult>
}

export interface ISmsProvider {
  readonly providerId: string
  sendSms(job: NotificationJobEntity): Promise<NotificationDispatchResult>
}

export interface IWhatsappProvider {
  readonly providerId: string
  sendWhatsapp(job: NotificationJobEntity): Promise<NotificationDispatchResult>
}
