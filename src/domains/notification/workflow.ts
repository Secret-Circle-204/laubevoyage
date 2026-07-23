import type { Payload } from 'payload'
import { NotificationRepository } from './repository'
import { NotificationDispatcher } from './dispatcher'
import { NotificationQueue } from './queue'
import { NotificationWorker } from './worker'
import { NotificationRateLimiter } from './rate-limiter'
import type { NotificationJobEntity, NotificationChannel, NotificationCategory, NotificationPriority, NotificationAttachment } from './types'

/**
 * Notification Workflow Engine
 * Central orchestrator handling async non-blocking notification queueing, idempotency checks, and background worker processing.
 * Symmetrical architecture with Booking, Payment, Loyalty, Experience, and Customer workflow engines.
 */
export class NotificationWorkflowEngine {
  public repository: NotificationRepository
  public dispatcher: NotificationDispatcher
  public queue: NotificationQueue
  public worker: NotificationWorker

  constructor(repository: NotificationRepository | Payload) {
    if (repository && 'findByCompoundKey' in repository) {
      this.repository = repository as NotificationRepository
    } else {
      this.repository = new NotificationRepository(repository as Payload)
    }
    this.dispatcher = new NotificationDispatcher()
    this.queue = new NotificationQueue()
    this.worker = new NotificationWorker(this.queue, this.dispatcher, this.repository)
  }

  /**
   * Async Non-Blocking Enqueue Workflow:
   * 1. Rate Limiting Check
   * 2. Idempotency Check (Compound Key: referenceType + referenceId + channel + templateId)
   * 3. Priority Queue Enqueue (Returns immediately to HTTP caller)
   */
  async executeEnqueueWorkflow(params: {
    referenceType: string
    referenceId: string
    recipient: string
    channel: NotificationChannel
    category: NotificationCategory
    priority?: NotificationPriority
    templateId: string
    translationKey: string
    templateData: Record<string, any>
    attachments?: NotificationAttachment[]
    sendAt?: string
    customerId?: number
  }): Promise<{ queued: boolean; jobId: string; reason?: string }> {
    // 1. Check Rate Limiting for OTPs
    if (params.category === 'marketing' && NotificationRateLimiter.isRateLimited(params.recipient)) {
      return { queued: false, jobId: '', reason: 'Rate limit exceeded for recipient' }
    }

    // 2. Check Compound Key Idempotency
    const existing = await this.repository.findByCompoundKey(
      params.referenceType,
      params.referenceId,
      params.channel,
      params.templateId,
    )

    if (existing) {
      return { queued: false, jobId: existing.jobId, reason: 'Duplicate notification skipped idempotently' }
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const job: NotificationJobEntity = {
      jobId,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      customerId: params.customerId,
      recipient: params.recipient,
      channel: params.channel,
      category: params.category,
      priority: params.priority || 'normal',
      templateId: params.templateId,
      translationKey: params.translationKey,
      templateData: params.templateData,
      attachments: params.attachments,
      sendAt: params.sendAt,
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    }

    // 3. Save to repository & Enqueue to async non-blocking priority queue
    await this.repository.saveJob(job)
    this.queue.enqueue(job)

    return { queued: true, jobId }
  }
}
