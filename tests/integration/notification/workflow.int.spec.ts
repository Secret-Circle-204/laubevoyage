import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationWorkflowEngine } from '@/domains/notification/workflow'

describe('Notification Domain: Workflow & Idempotency Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: NotificationWorkflowEngine

  beforeEach(() => {
    const db: any[] = []
    mockPayload = {
      create: vi.fn().mockImplementation((params: any) => {
        const doc = { id: Math.floor(Math.random() * 1000), ...params.data }
        db.push(doc)
        return Promise.resolve(doc)
      }),
      findByID: vi.fn(),
      find: vi.fn().mockImplementation(() => {
        return Promise.resolve({ docs: [...db] })
      }),
      update: vi.fn(),
    }
    workflowEngine = new NotificationWorkflowEngine(mockPayload)
    vi.spyOn(workflowEngine.dispatcher, 'dispatch').mockResolvedValue({
      success: true,
      providerMessageId: 'mock-msg-id',
    })
  })

  it('should enqueue notification, process via worker, and reject duplicate compound key idempotently', async () => {
    // 1. Enqueue Job
    const enqueueResult = await workflowEngine.executeEnqueueWorkflow({
      referenceType: 'BOOKING',
      referenceId: '101',
      recipient: 'ahmed@laube.com',
      channel: 'email',
      category: 'booking',
      priority: 'high',
      templateId: 'booking_confirmation',
      translationKey: 'booking.confirmed',
      templateData: { bookingNumber: '#LBV-101', customerName: 'Ahmed' },
    })

    expect(enqueueResult.queued).toBe(true)
    expect(workflowEngine.queue.size).toBe(1)

    // 2. Process via Worker
    const processed = await workflowEngine.worker.processNextJob()
    expect(processed).toBe(true)
    expect(workflowEngine.queue.size).toBe(0)

    // 3. Duplicate Enqueue Check (Idempotency)
    const duplicateResult = await workflowEngine.executeEnqueueWorkflow({
      referenceType: 'BOOKING',
      referenceId: '101',
      recipient: 'ahmed@laube.com',
      channel: 'email',
      category: 'booking',
      priority: 'high',
      templateId: 'booking_confirmation',
      translationKey: 'booking.confirmed',
      templateData: { bookingNumber: '#LBV-101', customerName: 'Ahmed' },
    })

    expect(duplicateResult.queued).toBe(false)
    expect(duplicateResult.reason).toContain('Duplicate notification skipped idempotently')
  })
})
