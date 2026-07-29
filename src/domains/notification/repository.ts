import type { Payload } from 'payload'
import type { NotificationJobEntity } from './types'

/**
 * Notification Repository
 * Sole data persistence layer for 'notification-logs' Payload collection with compound key idempotency.
 * Pure Database-First Single Source of Truth.
 */
export class NotificationRepository {
  private payload: Payload

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
    req?: any,
  ): Promise<NotificationJobEntity | null> {
    try {
      const res = await this.payload.find({
        collection: 'notification-logs',
        where: {
          and: [
            { referenceType: { equals: referenceType } },
            { referenceId: { equals: referenceId } },
            { channel: { equals: channel } },
            { templateId: { equals: templateId } },
          ],
        },
        limit: 1,
        req,
      })

      if (!res.docs.length) return null

      const doc: Record<string, any> = res.docs[0]
      return {
        jobId: doc.notificationId || String(doc.id),
        recipient: doc.recipient || '',
        channel: doc.channel,
        category: doc.category,
        priority: doc.priority,
        templateId: doc.templateId || '',
        translationKey: doc.translationKey || '',
        templateData: doc.templateData || {},
        referenceType: doc.referenceType || '',
        referenceId: doc.referenceId || '',
        status: doc.status,
        attempts: doc.attempts || 1,
        maxAttempts: doc.maxAttempts || 3,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  /**
   * Find notification logs for a specific recipient email.
   */
  async findByRecipient(recipientEmail: string, limit = 20, req?: any): Promise<NotificationJobEntity[]> {
    try {
      const res = await this.payload.find({
        collection: 'notification-logs',
        where: {
          recipient: { equals: recipientEmail },
        },
        limit,
        sort: '-createdAt',
        req,
      })

      return res.docs.map((doc: any) => ({
        jobId: doc.notificationId || String(doc.id),
        recipient: doc.recipient || '',
        channel: doc.channel,
        category: doc.category,
        priority: doc.priority || 'normal',
        templateId: doc.templateId || '',
        translationKey: doc.translationKey || '',
        templateData: doc.templateData || {},
        referenceType: doc.referenceType || '',
        referenceId: doc.referenceId || '',
        status: doc.status,
        attempts: doc.attempts || 0,
        maxAttempts: doc.maxAttempts || 3,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      }))
    } catch {
      return []
    }
  }

  /**
   * Find unfulfilled notification jobs for crash recovery (queued, failed under limit, or orphaned processing jobs).
   */
  async findRecoverableJobs(limit = 50, req?: any): Promise<NotificationJobEntity[]> {
    try {
      const res = await this.payload.find({
        collection: 'notification-logs',
        where: {
          or: [
            { status: { equals: 'queued' } },
            { status: { equals: 'processing' } },
            {
              and: [
                { status: { equals: 'failed' } },
                { attempts: { less_than: 3 } },
              ],
            },
          ],
        },
        limit,
        sort: 'createdAt',
        req,
      })

      return res.docs.map((doc: any) => ({
        jobId: doc.notificationId || String(doc.id),
        recipient: doc.recipient || '',
        channel: doc.channel,
        category: doc.category,
        priority: doc.priority || 'normal',
        templateId: doc.templateId || '',
        translationKey: doc.translationKey || '',
        templateData: doc.templateData || {},
        referenceType: doc.referenceType || '',
        referenceId: doc.referenceId || '',
        status: doc.status,
        attempts: doc.attempts || 0,
        maxAttempts: doc.maxAttempts || 3,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      }))
    } catch (error) {
      console.error('[NotificationRepository] Failed to find recoverable jobs:', error)
      return []
    }
  }

  async saveJob(job: NotificationJobEntity, req?: any): Promise<NotificationJobEntity> {
    try {
      const existingDocs = await this.payload.find({
        collection: 'notification-logs',
        where: {
          notificationId: { equals: job.jobId },
        },
        limit: 1,
        req,
      })

      if (existingDocs.docs.length > 0) {
        const doc = await this.payload.update({
          collection: 'notification-logs',
          id: existingDocs.docs[0].id,
          data: {
            status: job.status as any,
            attempts: job.attempts,
            lastError: job.lastError || null,
            sentAt: job.sentAt || null,
          },
          req,
        })

        return {
          ...job,
          jobId: doc?.notificationId || (doc?.id ? String(doc.id) : job.jobId),
        }
      } else {
        const doc = await this.payload.create({
          collection: 'notification-logs',
          data: {
            notificationId: job.jobId,
            recipient: job.recipient,
            channel: job.channel,
            category: job.category,
            priority: job.priority,
            templateId: job.templateId,
            translationKey: job.translationKey,
            templateData: job.templateData || {},
            referenceType: job.referenceType,
            referenceId: job.referenceId,
            status: job.status as any,
            attempts: job.attempts,
            lastError: job.lastError || null,
            sentAt: job.sentAt || null,
          } as any,
          req,
        })

        return {
          ...job,
          jobId: doc?.notificationId || (doc?.id ? String(doc.id) : job.jobId),
        }
      }
    } catch (error: unknown) {
      console.error(`[NotificationRepository] Failed to save job ${job.jobId}:`, error)
      throw error // Fail loudly
    }
  }
}
