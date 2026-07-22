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

    if (job.status === 'dlq' || job.attempts >= job.maxAttempts) {
      return {
        allowed: false,
        code: 'MAX_ATTEMPTS_EXCEEDED',
        reason: `Notification ${job.jobId} reached maximum retry limit (${job.maxAttempts})`,
      }
    }

    return { allowed: true }
  }
}
