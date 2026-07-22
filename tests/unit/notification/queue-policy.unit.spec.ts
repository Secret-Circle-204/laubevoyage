import { describe, it, expect } from 'vitest'
import { NotificationQueue } from '@/domains/notification/queue'
import { NotificationRateLimiter } from '@/domains/notification/rate-limiter'
import { NotificationPolicy } from '@/domains/notification/policy'
import type { NotificationJobEntity } from '@/domains/notification/types'

describe('Notification Domain: Priority Queue, Rate Limiter & Policy Unit Tests', () => {
  it('should order queued jobs by priority weight (critical > high > normal > low)', () => {
    const queue = new NotificationQueue()

    const lowJob: any = { jobId: '1', priority: 'low' }
    const criticalJob: any = { jobId: '2', priority: 'critical' }
    const highJob: any = { jobId: '3', priority: 'high' }

    queue.enqueue(lowJob)
    queue.enqueue(criticalJob)
    queue.enqueue(highJob)

    expect(queue.dequeue()?.priority).toBe('critical')
    expect(queue.dequeue()?.priority).toBe('high')
    expect(queue.dequeue()?.priority).toBe('low')
  })

  it('should rate limit recipient exceeding max requests per minute', () => {
    const recipient = 'spam@laube.com'
    expect(NotificationRateLimiter.isRateLimited(recipient, 2)).toBe(false)
    expect(NotificationRateLimiter.isRateLimited(recipient, 2)).toBe(false)
    expect(NotificationRateLimiter.isRateLimited(recipient, 2)).toBe(true) // 3rd request blocked
  })

  it('should enforce NotificationPolicy rules', () => {
    const invalidJob: NotificationJobEntity = {
      jobId: 'job_1',
      referenceType: 'BOOKING',
      referenceId: '101',
      recipient: '', // Empty recipient!
      channel: 'email',
      category: 'booking',
      priority: 'high',
      templateId: 'booking_confirmation',
      translationKey: 'booking.confirmed',
      templateData: {},
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: '2026-07-22T00:00:00.000Z',
    }

    const result = NotificationPolicy.canDispatch(invalidJob)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('MISSING_RECIPIENT')
  })
})
