import type { NotificationQueue } from './queue'
import type { NotificationJobEntity } from './types'

/**
 * Scheduled Notification Engine
 * Processes delayed/scheduled notifications (e.g., 24h pre-trip reminder, post-trip review).
 */
export class NotificationScheduler {
  private scheduledJobs: NotificationJobEntity[] = []
  private queue: NotificationQueue

  constructor(queue: NotificationQueue) {
    this.queue = queue
  }

  scheduleJob(job: NotificationJobEntity): void {
    if (!job.sendAt) {
      this.queue.enqueue(job)
      return
    }

    this.scheduledJobs.push(job)
  }

  /**
   * Process due scheduled jobs where sendAt <= now()
   */
  processDueJobs(): number {
    const now = new Date().toISOString()
    const dueJobs = this.scheduledJobs.filter((job) => job.sendAt && job.sendAt <= now)

    for (const job of dueJobs) {
      this.queue.enqueue(job)
    }

    // Remove due jobs from scheduled array
    this.scheduledJobs = this.scheduledJobs.filter((job) => !job.sendAt || job.sendAt > now)

    return dueJobs.length
  }
}
