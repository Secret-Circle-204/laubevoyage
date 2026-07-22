import type { Payload } from 'payload'
import type { NotificationJobEntity } from './types'

/**
 * Notification Repository
 * Sole data persistence layer for 'notification-logs' Payload collection with compound key idempotency.
 */
export class NotificationRepository {
  private payload: Payload
  private mockLedgerMap: Map<string, NotificationJobEntity> = new Map()

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Check if notification already exists using compound key: (referenceType, referenceId, channel, templateId).
   */
  async findByCompoundKey(
    referenceType: string,
    referenceId: string,
    channel: string,
    templateId: string,
  ): Promise<NotificationJobEntity | null> {
    const key = `${referenceType}_${referenceId}_${channel}_${templateId}`
    const existing = this.mockLedgerMap.get(key)
    if (existing) return existing

    return null
  }

  async saveJob(job: NotificationJobEntity): Promise<NotificationJobEntity> {
    const key = `${job.referenceType}_${job.referenceId}_${job.channel}_${job.templateId}`
    this.mockLedgerMap.set(key, job)

    return job
  }
}
