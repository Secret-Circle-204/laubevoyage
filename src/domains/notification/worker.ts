import type { NotificationQueue } from './queue'
import type { NotificationDispatcher } from './dispatcher'
import type { NotificationRepository } from './repository'
import { NotificationPolicy, NotificationRetryScheduler } from './policy'

/**
 * Background Notification Worker Engine
 * Asynchronously processes queued notification jobs with retries, DB crash recovery, and DLQ routing.
 */
export class NotificationWorker {
  private queue: NotificationQueue
  private dispatcher: NotificationDispatcher
  private repository: NotificationRepository
  private isRecovering = false

  constructor(queue: NotificationQueue, dispatcher: NotificationDispatcher, repository: NotificationRepository) {
    this.queue = queue
    this.dispatcher = dispatcher
    this.repository = repository
  }

  async recoverJobsFromDatabase(): Promise<number> {
    if (this.isRecovering) return 0
    this.isRecovering = true
    try {
      const recoverableJobs = await this.repository.findRecoverableJobs(50)
      for (const job of recoverableJobs) {
        this.queue.enqueue(job)
      }
      return recoverableJobs.length
    } finally {
      this.isRecovering = false
    }
  }

  async processNextJob(): Promise<boolean> {
    let job = this.queue.dequeue()
    if (!job) {
      // DB-backed recovery: Pull unfulfilled/orphaned jobs from notification-logs
      const recoveredCount = await this.recoverJobsFromDatabase()
      if (recoveredCount > 0) {
        console.log(`[NotificationWorker] Recovered ${recoveredCount} jobs from database queue.`);
        job = this.queue.dequeue()
      }
    }
    if (!job) return false

    console.log(`[NotificationWorker] ✉️ Processing job ${job.jobId} (Template: ${job.templateId}, Recipient: ${job.recipient}, Attempt: ${job.attempts + 1}/${job.maxAttempts})`);

    // Check policy
    const policyResult = NotificationPolicy.canDispatch(job)
    if (!policyResult.allowed) {
      console.warn(`[NotificationWorker] ⚠️ Job ${job.jobId} dispatch rejected by policy: ${policyResult.reason}`);
      job.status = 'failed'
      job.lastError = policyResult.reason
      await this.repository.saveJob(job)
      return false
    }

    job.status = 'processing'
    job.attempts += 1
    job.lastAttemptAt = new Date().toISOString()
    await this.repository.saveJob(job)

    try {
      const result = await this.dispatcher.dispatch(job)

      if (result.success) {
        console.log(`[NotificationWorker] ✅ Job ${job.jobId} successfully delivered to ${job.recipient}.`);
        job.status = 'delivered'
        job.sentAt = new Date().toISOString()
        await this.repository.saveJob(job)
        return true
      }

      console.error(`[NotificationWorker] ❌ Job ${job.jobId} dispatch failed: ${result.error || 'Unknown error'}`);

      const delaySeconds = NotificationRetryScheduler.calculateNextAttemptDelay(job.channel, job.attempts)

      if (delaySeconds === null) {
        console.error(`[NotificationWorker] 🚨 Job ${job.jobId} exceeded max attempts. Routing to DLQ.`);
        job.status = 'dlq'
        job.lastError = result.error || 'Max retries reached'
      } else {
        job.status = 'failed'
        job.lastError = result.error
        job.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString()
      }
    } catch (err: any) {
      console.error(`[NotificationWorker] ❌ Exception during job ${job.jobId} execution: ${err.message}`);
      const delaySeconds = NotificationRetryScheduler.calculateNextAttemptDelay(job.channel, job.attempts)

      if (delaySeconds === null) {
        job.status = 'dlq'
        job.lastError = err.message || 'Max retries reached'
      } else {
        job.status = 'failed'
        job.lastError = err.message
        job.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString()
      }
    }

    await this.repository.saveJob(job)
    return false
  }
}
