import type { NotificationQueue } from './queue'
import type { NotificationDispatcher } from './dispatcher'
import type { NotificationRepository } from './repository'
import { NotificationPolicy } from './policy'

/**
 * Background Notification Worker Engine
 * Asynchronously processes queued notification jobs with retries and DLQ routing.
 */
export class NotificationWorker {
  private queue: NotificationQueue
  private dispatcher: NotificationDispatcher
  private repository: NotificationRepository

  constructor(queue: NotificationQueue, dispatcher: NotificationDispatcher, repository: NotificationRepository) {
    this.queue = queue
    this.dispatcher = dispatcher
    this.repository = repository
  }

  async processNextJob(): Promise<boolean> {
    const job = this.queue.dequeue()
    if (!job) return false

    // Check policy
    const policyResult = NotificationPolicy.canDispatch(job)
    if (!policyResult.allowed) {
      job.status = 'failed'
      job.lastError = policyResult.reason
      await this.repository.saveJob(job)
      return false
    }

    job.status = 'processing'
    job.attempts += 1

    const result = await this.dispatcher.dispatch(job)

    if (result.success) {
      job.status = 'delivered'
      job.sentAt = new Date().toISOString()
      await this.repository.saveJob(job)
      return true
    }

    if (job.attempts >= job.maxAttempts) {
      job.status = 'dlq'
      job.lastError = result.error || 'Max retries reached'
    } else {
      job.status = 'failed'
      job.lastError = result.error
      // Re-enqueue for retry
      this.queue.enqueue(job)
    }

    await this.repository.saveJob(job)
    return false
  }
}
