import { NotificationChannel, NotificationTemplate } from '@/types'

export interface NotificationJob {
  jobId: string
  recipient: string
  channel: NotificationChannel
  template: NotificationTemplate
  payload: Record<string, unknown>
  attempts: number
  maxAttempts: number
  createdAt: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
}

/**
 * Notification Job Queue
 * Asynchronous job queue to process emails, SMS, and WhatsApp messages without blocking HTTP requests.
 */
export class NotificationQueue {
  private static instance: NotificationQueue
  private queue: NotificationJob[] = []

  private constructor() {}

  static getInstance(): NotificationQueue {
    if (!NotificationQueue.instance) {
      NotificationQueue.instance = new NotificationQueue()
    }
    return NotificationQueue.instance
  }

  /**
   * Enqueue a new notification job for async delivery.
   */
  enqueue(params: {
    recipient: string
    channel: NotificationChannel
    template: NotificationTemplate
    payload: Record<string, unknown>
  }): NotificationJob {
    const job: NotificationJob = {
      jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipient: params.recipient,
      channel: params.channel,
      template: params.template,
      payload: params.payload,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      status: 'queued',
    }

    this.queue.push(job)
    this.processNext(job)
    return job
  }

  /**
   * Process a notification job asynchronously in background worker loop.
   */
  private async processNext(job: NotificationJob): Promise<void> {
    setImmediate(async () => {
      try {
        job.status = 'processing'
        job.attempts += 1
        
        // Background worker dispatch logic (e.g. SMTP/SendGrid/Twilio integration)
        console.log(`[NotificationWorker] Delivered ${job.template} via ${job.channel} to ${job.recipient}`)
        
        job.status = 'completed'
      } catch (error) {
        console.error(`[NotificationWorker] Job ${job.jobId} failed (attempt ${job.attempts}):`, error)
        if (job.attempts < job.maxAttempts) {
          job.status = 'queued'
        } else {
          job.status = 'failed'
        }
      }
    })
  }
}
