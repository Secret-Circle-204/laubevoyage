export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low'
export type NotificationChannel = 'email' | 'sms' | 'push' | 'whatsapp'
export type NotificationCategory = 'marketing' | 'booking' | 'payment' | 'loyalty' | 'security'
export type NotificationStatus = 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'dlq'

export interface NotificationAttachment {
  filename: string
  content: string
  contentType: string
}

export interface SenderIdentity {
  fromName: string
  fromEmail: string
  replyTo: string
}

export interface NotificationJobEntity {
  jobId: string
  referenceType: string
  referenceId: string
  customerId?: number
  recipient: string
  channel: NotificationChannel
  category: NotificationCategory
  priority: NotificationPriority
  templateId: string
  translationKey: string
  templateData: Record<string, unknown>
  attachments?: NotificationAttachment[]
  sendAt?: string
  status: NotificationStatus
  attempts: number
  maxAttempts: number
  lastError?: string
  sentAt?: string
  nextAttemptAt?: string
  lastAttemptAt?: string
  createdAt: string
}

export interface NotificationPolicyResult {
  allowed: boolean
  code?: string
  reason?: string
}
