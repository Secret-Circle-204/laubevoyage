import type { Payload, PayloadRequest } from 'payload'
import type { NotificationJobEntity } from './types'
import type { NotificationLog } from '@/payload-types'
import type { PostgresAdapter } from '@payloadcms/db-postgres'

import { NotificationRetryScheduler } from './policy'
import { MaintenanceLeaseService } from '../maintenance/lease-service'

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

  get payloadInstance(): Payload {
    return this.payload
  }

  /**
   * Check if notification already exists using compound key: (referenceType, referenceId, channel, templateId).
   */
  async findByCompoundKey(
    referenceType: string,
    referenceId: string,
    channel: string,
    templateId: string,
    req?: PayloadRequest,
  ): Promise<NotificationJobEntity | null> {
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

    const doc: NotificationLog = res.docs[0]
    return {
      jobId: doc.notificationId || String(doc.id),
      recipient: doc.recipient || '',
      channel: doc.channel,
      category: doc.category,
      priority: doc.priority || 'normal',
      templateId: doc.templateId || '',
      translationKey: '',
      templateData: (doc.templateData || {}) as Record<string, unknown>,
      referenceType: doc.referenceType || '',
      referenceId: doc.referenceId || '',
      status: doc.status,
      attempts: doc.attempts || 0,
      maxAttempts: 3,
      nextAttemptAt: doc.nextAttemptAt ? new Date(doc.nextAttemptAt).toISOString() : undefined,
      lastAttemptAt: doc.lastAttemptAt ? new Date(doc.lastAttemptAt).toISOString() : undefined,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }
  }

  async getJobById(jobId: string, req?: PayloadRequest): Promise<NotificationJobEntity | null> {
    const res = await this.payload.find({
      collection: 'notification-logs',
      where: {
        notificationId: { equals: jobId },
      },
      limit: 1,
      req,
    })

    if (!res.docs.length) return null

    const doc: NotificationLog = res.docs[0]
    return {
      jobId: doc.notificationId || String(doc.id),
      recipient: doc.recipient || '',
      channel: doc.channel,
      category: doc.category,
      priority: doc.priority || 'normal',
      templateId: doc.templateId || '',
      translationKey: '',
      templateData: (doc.templateData || {}) as Record<string, unknown>,
      referenceType: doc.referenceType || '',
      referenceId: doc.referenceId || '',
      status: doc.status,
      attempts: doc.attempts || 0,
      maxAttempts: 3,
      nextAttemptAt: doc.nextAttemptAt ? new Date(doc.nextAttemptAt).toISOString() : undefined,
      lastAttemptAt: doc.lastAttemptAt ? new Date(doc.lastAttemptAt).toISOString() : undefined,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }
  }

  /**
   * Find notification logs for a specific recipient email with server-side pagination and DB filtering.
   */
  async findByRecipient(
    recipientEmail: string,
    page = 1,
    limit = 20,
    filters?: { category?: import('./types').NotificationCategory },
    req?: PayloadRequest,
  ): Promise<import('@/types').PaginatedResponse<NotificationJobEntity>> {
    const where: any = {
      recipient: { equals: recipientEmail },
    }
    if (filters?.category) {
      where.category = { equals: filters.category }
    }

    const res = await this.payload.find({
      collection: 'notification-logs',
      where,
      page,
      limit,
      sort: '-createdAt',
      req,
    })

    return {
      data: res.docs.map((doc: NotificationLog) => ({
        jobId: doc.notificationId || String(doc.id),
        recipient: doc.recipient || '',
        channel: doc.channel,
        category: doc.category,
        priority: doc.priority || 'normal',
        templateId: doc.templateId || '',
        translationKey: '',
        templateData: (doc.templateData || {}) as Record<string, unknown>,
        referenceType: doc.referenceType || '',
        referenceId: doc.referenceId || '',
        status: doc.status,
        attempts: doc.attempts || 0,
        maxAttempts: 3,
        nextAttemptAt: doc.nextAttemptAt ? new Date(doc.nextAttemptAt).toISOString() : undefined,
        lastAttemptAt: doc.lastAttemptAt ? new Date(doc.lastAttemptAt).toISOString() : undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      })),
      total: res.totalDocs,
      page: res.page || 1,
      limit: res.limit || 20,
      totalPages: res.totalPages || 1,
    }
  }

  /**
   * Atomically identify and transition stale 'processing' jobs whose lease has expired / does not exist.
   * Concurrency Guard: Checks maintenance_leases table to ensure no active worker holds an unexpired lease.
   * Attempts Semantics: Preserves current attempts count (does NOT increment).
   * Policy: Calculates nextAttemptAt strictly through NotificationRetryScheduler. Transitions to 'dlq' if max attempts reached.
   */
  async reapStaleProcessingJobs(limit = 50, req?: PayloadRequest): Promise<number> {
    const staleDocs = await this.payload.find({
      collection: 'notification-logs',
      where: {
        status: { equals: 'processing' },
      },
      limit,
      req,
    })

    let reapedCount = 0
    for (const doc of staleDocs.docs as NotificationLog[]) {
      const jobId = doc.notificationId || String(doc.id)
      const activeLease = await MaintenanceLeaseService.getActiveLease(this.payload, `notification_job_${jobId}`)
      if (!activeLease) {
        const attempts = doc.attempts || 0
        const delaySeconds = NotificationRetryScheduler.calculateNextAttemptDelay(doc.channel, attempts)
        if (delaySeconds === null || attempts >= 3) {
          await this.payload.update({
            collection: 'notification-logs',
            id: doc.id,
            data: {
              status: 'dlq',
              lastError: 'Worker process crashed or lease expired while processing (max attempts reached)',
              nextAttemptAt: null,
            },
            req,
          })
        } else {
          const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString()
          await this.payload.update({
            collection: 'notification-logs',
            id: doc.id,
            data: {
              status: 'failed',
              lastError: 'Worker process crashed or lease expired while processing',
              nextAttemptAt,
            },
            req,
          })
        }
        reapedCount++
      }
    }
    return reapedCount
  }

  /**
   * Find unfulfilled notification jobs for crash recovery (queued or failed under limit).
   * Note: Raw 'processing' jobs are handled by reapStaleProcessingJobs() and never returned directly.
   */
  async findRecoverableJobs(limit = 50, req?: PayloadRequest): Promise<NotificationJobEntity[]> {
    const nowIso = new Date().toISOString()
    const res = await this.payload.find({
      collection: 'notification-logs',
      where: {
        or: [
          { status: { equals: 'queued' } },
          {
            and: [
              { status: { equals: 'failed' } },
              { attempts: { less_than: 3 } },
              {
                or: [
                  { nextAttemptAt: { less_than_equal: nowIso } },
                  { nextAttemptAt: { equals: null } },
                  { nextAttemptAt: { exists: false } },
                ],
              },
            ],
          },
        ],
      },
      limit,
      sort: 'createdAt',
      req,
    })

    return res.docs.map((doc: NotificationLog) => ({
      jobId: doc.notificationId || String(doc.id),
      recipient: doc.recipient || '',
      channel: doc.channel,
      category: doc.category,
      priority: doc.priority || 'normal',
      templateId: doc.templateId || '',
      translationKey: '',
      templateData: (doc.templateData || {}) as Record<string, unknown>,
      referenceType: doc.referenceType || '',
      referenceId: doc.referenceId || '',
      status: doc.status,
      attempts: doc.attempts || 0,
      maxAttempts: 3,
      nextAttemptAt: doc.nextAttemptAt ? new Date(doc.nextAttemptAt).toISOString() : undefined,
      lastAttemptAt: doc.lastAttemptAt ? new Date(doc.lastAttemptAt).toISOString() : undefined,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }))
  }

  /**
   * Atomic claim query to transition notification log status to 'processing' and increment attempts count.
   * Concurrency is handled at database layer via Postgres atomic conditional update.
   */
  async claimJob(jobId: string, workerId: string, req?: PayloadRequest): Promise<boolean> {
    const dbAdapter = this.payload.db as unknown as PostgresAdapter
    const pool = dbAdapter?.pool
    if (!pool || typeof pool.query !== 'function') {
      // Test environment fallback: use Payload document operations
      const existing = await this.payload.find({
        collection: 'notification-logs',
        where: {
          notificationId: { equals: jobId },
        },
        limit: 1,
        req,
      })
      const doc = existing.docs[0]
      if (doc && (doc.status === 'queued' || doc.status === 'failed')) {
        await this.payload.update({
          collection: 'notification-logs',
          id: doc.id,
          data: {
            status: 'processing',
            attempts: (doc.attempts || 0) + 1,
            lastAttemptAt: new Date().toISOString(),
          },
          req,
        })
        return true
      }
      return false
    }

    console.log(`[NotificationRepository] Worker ${workerId} is claiming job ${jobId}`)

    const query = `
      UPDATE "notification_logs"
      SET "status" = 'processing',
          "attempts" = "attempts" + 1,
          "last_attempt_at" = NOW()
      WHERE "notification_id" = $1
        AND ("status" = 'queued' OR "status" = 'failed')
      RETURNING *;
    `
    const res = await pool.query(query, [jobId])
    return res.rows.length > 0
  }

  async saveJob(job: NotificationJobEntity, req?: PayloadRequest): Promise<NotificationJobEntity> {
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
          status: job.status,
          attempts: job.attempts,
          lastError: job.lastError || null,
          sentAt: job.sentAt || null,
          nextAttemptAt: job.nextAttemptAt || null,
          lastAttemptAt: job.lastAttemptAt || null,
        },
        req,
      })

      return {
        ...job,
        jobId: doc.notificationId || (doc.id ? String(doc.id) : job.jobId),
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
          templateData: job.templateData || {},
          referenceType: job.referenceType,
          referenceId: job.referenceId,
          status: job.status,
          attempts: job.attempts,
          lastError: job.lastError || null,
          sentAt: job.sentAt || null,
          nextAttemptAt: job.nextAttemptAt || null,
          lastAttemptAt: job.lastAttemptAt || null,
        },
      })

      return {
        ...job,
        jobId: doc.notificationId || (doc.id ? String(doc.id) : job.jobId),
      }
    }
  }
}
