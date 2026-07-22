import { describe, it, expect, vi } from 'vitest'
import { FailoverNotificationProvider } from '@/domains/notification/providers/failover-provider'
import { NotificationScheduler } from '@/domains/notification/scheduler'
import { NotificationQueue } from '@/domains/notification/queue'
import { NotificationAttachmentService } from '@/domains/notification/attachment-generator'

describe('Notification Domain: Failover, Scheduler & Attachment Unit Tests', () => {
  it('should fallback to secondary provider if primary provider fails', async () => {
    const failingProvider: any = { send: vi.fn().mockResolvedValue({ success: false, error: 'Primary failed' }) }
    const successProvider: any = { send: vi.fn().mockResolvedValue({ success: true, providerMessageId: 'sec_101' }) }

    const failover = new FailoverNotificationProvider([failingProvider, successProvider])
    const result = await failover.send({} as any)

    expect(result.success).toBe(true)
    expect(result.providerMessageId).toBe('sec_101')
  })

  it('should process due scheduled jobs when sendAt <= now()', () => {
    const queue = new NotificationQueue()
    const scheduler = new NotificationScheduler(queue)

    const pastJob: any = { jobId: '1', priority: 'normal', sendAt: '2026-01-01T00:00:00.000Z' }
    const futureJob: any = { jobId: '2', priority: 'normal', sendAt: '2099-01-01T00:00:00.000Z' }

    scheduler.scheduleJob(pastJob)
    scheduler.scheduleJob(futureJob)

    const processedCount = scheduler.processDueJobs()
    expect(processedCount).toBe(1)
    expect(queue.size).toBe(1)
  })

  it('should generate PDF Voucher attachments', () => {
    const attachment = NotificationAttachmentService.generateVoucherAttachment('#LBV-999')
    expect(attachment.filename).toBe('Voucher_#LBV-999.pdf')
    expect(attachment.contentType).toBe('application/pdf')
  })
})
