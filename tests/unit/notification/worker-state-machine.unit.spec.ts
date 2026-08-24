import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationRepository } from '@/domains/notification/repository'
import { NotificationWorker } from '@/domains/notification/worker'
import { NotificationQueue } from '@/domains/notification/queue'
import { NotificationDispatcher } from '@/domains/notification/dispatcher'
import { MaintenanceLeaseService } from '@/domains/maintenance/lease-service'
import { NotificationRetryScheduler } from '@/domains/notification/policy'
import type { NotificationLog } from '@/payload-types'

describe('Notification Domain: Worker State Machine & Stale Recovery Architecture (Design B)', () => {
  let mockDocs: any[] = []
  let mockPayload: any
  let repository: NotificationRepository
  let queue: NotificationQueue
  let dispatcher: NotificationDispatcher
  let worker: NotificationWorker

  beforeEach(() => {
    mockDocs = []
    mockPayload = {
      db: {}, // In-memory fallback mode
      find: vi.fn(async ({ collection, where, limit }: any) => {
        if (collection === 'notification-logs') {
          let filtered = [...mockDocs]
          if (where?.status?.equals) {
            filtered = filtered.filter((d) => d.status === where.status.equals)
          }
          if (where?.or) {
            filtered = filtered.filter((d) => {
              return where.or.some((clause: any) => {
                if (clause.status?.equals) {
                  return d.status === clause.status.equals
                }
                if (clause.and) {
                  const statusMatch = clause.and.some((c: any) => c.status?.equals && d.status === c.status.equals)
                  const attemptsMatch = clause.and.some(
                    (c: any) => c.attempts?.less_than !== undefined && d.attempts < c.attempts.less_than
                  )
                  const nextAttemptMatch = clause.and.some((c: any) => {
                    if (!c.or) return false
                    return c.or.some((sub: any) => {
                      if (sub.nextAttemptAt?.less_than_equal) {
                        return d.nextAttemptAt && new Date(d.nextAttemptAt).getTime() <= new Date(sub.nextAttemptAt.less_than_equal).getTime()
                      }
                      if (sub.nextAttemptAt?.equals === null) {
                        return d.nextAttemptAt === null
                      }
                      if (sub.nextAttemptAt?.exists === false) {
                        return d.nextAttemptAt === undefined
                      }
                      return false
                    })
                  })
                  return statusMatch && attemptsMatch && nextAttemptMatch
                }
                return false
              })
            })
          }
          if (where?.notificationId?.equals) {
            filtered = filtered.filter((d) => (d.notificationId || String(d.id)) === where.notificationId.equals)
          }
          return {
            docs: limit ? filtered.slice(0, limit) : filtered,
            totalDocs: filtered.length,
            page: 1,
            limit: limit || 10,
            totalPages: 1,
          }
        }
        return { docs: [], totalDocs: 0, page: 1, limit: 10, totalPages: 1 }
      }),
      findByID: vi.fn(async ({ id }: any) => {
        return mockDocs.find((d) => d.id === id) || null
      }),
      update: vi.fn(async ({ id, data }: any) => {
        const doc = mockDocs.find((d) => d.id === id)
        if (doc) {
          Object.assign(doc, data)
          return doc
        }
        throw new Error(`Doc #${id} not found`)
      }),
      create: vi.fn(async ({ data }: any) => {
        const newDoc = { id: mockDocs.length + 1, ...data }
        mockDocs.push(newDoc)
        return newDoc
      }),
    }

    repository = new NotificationRepository(mockPayload)
    queue = new NotificationQueue()
    dispatcher = new NotificationDispatcher()
    worker = new NotificationWorker(queue, dispatcher, repository)
  })

  // =========================================================================
  // TEST 1: Stale Processing Recovery (No Active Lease -> Failed with Retry Delay)
  // =========================================================================
  it('Scenario 1: Stale Processing Recovery — transitions stale processing job without active lease to failed with scheduled nextAttemptAt and preserves attempts = 1', async () => {
    mockDocs.push({
      id: 101,
      notificationId: 'job_stale_1',
      recipient: 'traveler@example.com',
      channel: 'email',
      category: 'booking',
      priority: 'normal',
      templateId: 'booking_confirmed',
      status: 'processing',
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    })

    // Verify no active lease in MaintenanceLeaseService
    const activeLease = await MaintenanceLeaseService.getActiveLease('notification_job_job_stale_1')
    expect(activeLease).toBeUndefined()

    // Run reap
    const reapedCount = await repository.reapStaleProcessingJobs(50)
    expect(reapedCount).toBe(1)

    // Check doc state after reap
    const doc = mockDocs.find((d) => d.notificationId === 'job_stale_1')
    expect(doc.status).toBe('failed')
    expect(doc.attempts).toBe(1) // Invariant: attempts is preserved, NOT incremented during reap
    expect(doc.lastError).toContain('Worker process crashed or lease expired while processing')
    expect(doc.nextAttemptAt).toBeDefined()

    // Verify delay corresponds to NotificationRetryScheduler for email attempt 1 -> 30s
    const expectedDelay = NotificationRetryScheduler.calculateNextAttemptDelay('email', 1)
    expect(expectedDelay).toBe(30)
  })

  // =========================================================================
  // TEST 2: Active Lease Guard (Active Lease -> MUST NOT be reaped)
  // =========================================================================
  it('Scenario 2: Active Lease Guard — processing job with an active unexpired lease MUST NOT be touched by the reaper', async () => {
    mockDocs.push({
      id: 102,
      notificationId: 'job_active_2',
      recipient: 'traveler@example.com',
      channel: 'email',
      category: 'booking',
      priority: 'normal',
      templateId: 'booking_confirmed',
      status: 'processing',
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    })

    // Acquire active lease for Worker A
    const acquired = await MaintenanceLeaseService.acquireLease('notification_job_job_active_2', 'worker_A', 60000)
    expect(acquired).toBe(true)

    // Worker B runs reaper
    const reapedCount = await repository.reapStaleProcessingJobs(50)
    expect(reapedCount).toBe(0)

    // Verify doc remains in processing untouched
    const doc = mockDocs.find((d) => d.notificationId === 'job_active_2')
    expect(doc.status).toBe('processing')
    expect(doc.attempts).toBe(1)
    expect(doc.lastError).toBeUndefined()

    // Clean up lease
    await MaintenanceLeaseService.releaseLease('notification_job_job_active_2', 'worker_A')
  })

  // =========================================================================
  // TEST 3: DLQ Routing on Max Attempts (attempts >= 3 -> dlq)
  // =========================================================================
  it('Scenario 3: DLQ Routing on Max Attempts — stale processing job with attempts = 3 transitions directly to dlq and is never recovered again', async () => {
    mockDocs.push({
      id: 103,
      notificationId: 'job_poison_3',
      recipient: 'traveler@example.com',
      channel: 'email',
      category: 'booking',
      priority: 'normal',
      templateId: 'booking_confirmed',
      status: 'processing',
      attempts: 3,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    })

    // Run reap
    const reapedCount = await repository.reapStaleProcessingJobs(50)
    expect(reapedCount).toBe(1)

    // Verify transitioned to dlq
    const doc = mockDocs.find((d) => d.notificationId === 'job_poison_3')
    expect(doc.status).toBe('dlq')
    expect(doc.attempts).toBe(3)
    expect(doc.lastError).toContain('max attempts reached')
    expect(doc.nextAttemptAt).toBeNull()

    // Verify findRecoverableJobs does NOT return DLQ jobs
    const recoverable = await repository.findRecoverableJobs(50)
    expect(recoverable.some((j) => j.jobId === 'job_poison_3')).toBe(false)
  })

  // =========================================================================
  // TEST 4: Head-of-Line Blocking Prevention (50 Stale Jobs + 1 New Queued Job)
  // =========================================================================
  it('Scenario 4: Head-of-Line Blocking Prevention — 50 stale processing jobs do NOT block a new queued job from immediate processing', async () => {
    // Seed 50 stale processing jobs (oldest createdAt)
    for (let i = 1; i <= 50; i++) {
      mockDocs.push({
        id: i,
        notificationId: `stale_job_${i}`,
        recipient: `user${i}@example.com`,
        channel: 'email',
        category: 'marketing',
        priority: 'normal',
        templateId: 'welcome_email',
        status: 'processing',
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date(Date.now() - 100000 + i * 100).toISOString(),
      })
    }

    // Seed 1 new queued job (newest createdAt)
    mockDocs.push({
      id: 51,
      notificationId: 'new_urgent_job_51',
      recipient: 'urgent@example.com',
      channel: 'email',
      category: 'booking',
      priority: 'high',
      templateId: 'booking_confirmed',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    })

    // Mock dispatcher success
    vi.spyOn(dispatcher, 'dispatch').mockResolvedValue({ success: true, providerMessageId: 'msg_51' })

    // Process next job via worker
    const processed = await worker.processNextJob()
    expect(processed).toBe(true)

    // Verify all 50 stale jobs were reaped to 'failed' with future nextAttemptAt
    const reapedCount = mockDocs.filter((d) => d.status === 'failed').length
    expect(reapedCount).toBe(50)

    // Verify the new urgent job was processed and delivered immediately without blockage
    const urgentDoc = mockDocs.find((d) => d.notificationId === 'new_urgent_job_51')
    expect(urgentDoc.status).toBe('delivered')
    expect(urgentDoc.attempts).toBe(1)
  })

  // =========================================================================
  // TEST 5: Multi-Worker Concurrency & Race Safety
  // =========================================================================
  it('Scenario 5: Multi-Worker Race Safety — two concurrent workers cannot double-claim or double-reap the same job', async () => {
    mockDocs.push({
      id: 105,
      notificationId: 'job_race_5',
      recipient: 'traveler@example.com',
      channel: 'email',
      category: 'booking',
      priority: 'normal',
      templateId: 'booking_confirmed',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    })

    const worker1 = new NotificationWorker(new NotificationQueue(), dispatcher, repository)
    const worker2 = new NotificationWorker(new NotificationQueue(), dispatcher, repository)

    vi.spyOn(dispatcher, 'dispatch').mockResolvedValue({ success: true, providerMessageId: 'msg_race' })

    // Worker 1 claims job
    const claimed1 = await repository.claimJob('job_race_5', 'worker_1')
    expect(claimed1).toBe(true)

    // Worker 2 attempts to claim the same job concurrently
    const claimed2 = await repository.claimJob('job_race_5', 'worker_2')
    expect(claimed2).toBe(false) // Second worker is atomically rejected
  })

  // =========================================================================
  // TEST 6: Crash After External Dispatch (At-Least-Once Delivery Semantics)
  // =========================================================================
  it('Scenario 6: Crash After External Dispatch — simulates crash immediately after external provider send and verifies deterministic re-dispatch after lease expiry', async () => {
    mockDocs.push({
      id: 106,
      notificationId: 'job_crash_after_send_6',
      recipient: 'traveler@example.com',
      channel: 'email',
      category: 'booking',
      priority: 'normal',
      templateId: 'booking_confirmed',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    })

    let externalSendCount = 0
    vi.spyOn(dispatcher, 'dispatch').mockImplementation(async () => {
      externalSendCount++
      // Simulate external provider accepting email, then worker process crashing before saveJob('delivered')
      throw new Error('Simulated process crash / power outage immediately after external send')
    })

    // Worker A attempts execution -> sends email to external provider -> crashes with error
    await worker.processNextJob()

    expect(externalSendCount).toBe(1)
    const crashedDoc = mockDocs.find((d) => d.notificationId === 'job_crash_after_send_6')
    expect(crashedDoc.status).toBe('failed')
    expect(crashedDoc.attempts).toBe(1)
    expect(crashedDoc.lastError).toContain('Simulated process crash')

    // Simulate retry delay expiring
    crashedDoc.nextAttemptAt = new Date(Date.now() - 1000).toISOString()

    // Now restore healthy dispatcher
    vi.spyOn(dispatcher, 'dispatch').mockImplementation(async () => {
      externalSendCount++
      return { success: true, providerMessageId: 'msg_recovered_6' }
    })

    // Worker B recovers and processes the retry
    const workerB = new NotificationWorker(new NotificationQueue(), dispatcher, repository)
    const success = await workerB.processNextJob()
    expect(success).toBe(true)

    // Verify At-Least-Once Delivery behavior: external provider received 2 sends, final state delivered, attempts = 2
    expect(externalSendCount).toBe(2)
    expect(crashedDoc.status).toBe('delivered')
    expect(crashedDoc.attempts).toBe(2)
  })
})
