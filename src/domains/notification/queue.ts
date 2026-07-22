import type { NotificationJobEntity, NotificationPriority } from './types'

/**
 * Priority Order Weight: critical (4) > high (3) > normal (2) > low (1)
 */
const PRIORITY_WEIGHTS: Record<NotificationPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

/**
 * Async Non-blocking Notification Queue
 */
export class NotificationQueue {
  private queue: NotificationJobEntity[] = []

  enqueue(job: NotificationJobEntity): void {
    this.queue.push(job)
    // Sort queue by priority weight descending
    this.queue.sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority])
  }

  dequeue(): NotificationJobEntity | undefined {
    return this.queue.shift()
  }

  get size(): number {
    return this.queue.length
  }
}
