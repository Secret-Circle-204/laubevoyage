import type { NotificationJobEntity, NotificationPolicyResult } from './types'

/**
 * Pure Notification Policy
 * Single source of truth for notification dispatching predicates.
 */
export class NotificationPolicy {
  /**
   * Validate if a notification job can be dispatched.
   */
  static canDispatch(job: NotificationJobEntity): NotificationPolicyResult {
    if (!job.recipient || job.recipient.trim() === '') {
      return {
        allowed: false,
        code: 'MISSING_RECIPIENT',
        reason: 'Notification recipient address/phone is missing.',
      }
    }

    if (job.status === 'dlq' || job.attempts > job.maxAttempts) {
      return {
        allowed: false,
        code: 'MAX_ATTEMPTS_EXCEEDED',
        reason: `Notification ${job.jobId} exceeded maximum retry limit (${job.maxAttempts})`,
      }
    }

    return { allowed: true }
  }
}

export class NotificationRetryScheduler {
  private static readonly RETRY_DELAYS_BY_CHANNEL: Record<string, number[]> = {
    email: [30, 300], // Attempt 2: 30s, Attempt 3: 5m
    sms: [30, 300],
    push: [30, 300],
    whatsapp: [30, 300],
  }

  static calculateNextAttemptDelay(channel: string, attempts: number): number | null {
    const delays = this.RETRY_DELAYS_BY_CHANNEL[channel] || [30, 300]
    const index = attempts - 1
    if (index >= 0 && index < delays.length) {
      return delays[index]
    }
    return null
  }
}
