import type { Payload } from 'payload'
import type { NotificationJobEntity } from './types'

/**
 * Notification Repository
 * Sole data persistence layer for 'notification-logs' Payload collection with compound key idempotency.
 */
export class NotificationRepository {
  private payload: Payload
  private jobLedgerMap: Map<string, NotificationJobEntity> = new Map()

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
    const cached = this.jobLedgerMap.get(key)
    if (cached) return cached

    try {
      const res = await this.payload.find({
        collection: 'notification-logs' as any,
        where: {
          and: [
            { referenceType: { equals: referenceType } },
            { referenceId: { equals: referenceId } },
            { channel: { equals: channel } },
            { templateId: { equals: templateId } },
          ],
        },
        limit: 1,
      })

      if (!res.docs.length) return null

      const doc = res.docs[0] as any
      return {
        jobId: String(doc.id),
        recipient: doc.recipient || '',
        channel: doc.channel || 'email',
        category: doc.category || 'booking',
        priority: doc.priority || 'normal',
        templateId: doc.templateId || '',
        translationKey: doc.translationKey || '',
        templateData: doc.templateData || {},
        referenceType: doc.referenceType || '',
        referenceId: doc.referenceId || '',
        status: doc.status || 'sent',
        attempts: doc.attempts || 1,
        maxAttempts: doc.maxAttempts || 3,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  async saveJob(job: NotificationJobEntity): Promise<NotificationJobEntity> {
    const key = `${job.referenceType}_${job.referenceId}_${job.channel}_${job.templateId}`
    this.jobLedgerMap.set(key, job)

    try {
      const doc = await this.payload.create({
        collection: 'notification-logs' as any,
        data: {
          recipient: job.recipient,
          channel: job.channel,
          category: job.category,
          priority: job.priority,
          templateId: job.templateId,
          referenceType: job.referenceType,
          referenceId: job.referenceId,
          status: job.status,
          attempts: job.attempts,
        },
      })

      return {
        ...job,
        jobId: String(doc.id),
      }
    } catch {
      return job
    }
  }
}
