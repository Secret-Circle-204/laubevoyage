import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationRepository } from '@/domains/notification/repository'
import { MaintenanceLeaseService } from '@/domains/maintenance/lease-service'

describe('Notification Domain Integration: PostgreSQL Atomic Reaper & Stale Recovery (Design B)', () => {
  let mockPayload: any
  let repository: NotificationRepository
  let inMemoryDb: any[]

  beforeEach(() => {
    inMemoryDb = []
    mockPayload = {
      find: vi.fn().mockImplementation(({ collection, where }: any) => {
        if (collection === 'notification-logs') {
          const statusMatch = where?.status?.equals
          const filtered = inMemoryDb.filter((doc) => !statusMatch || doc.status === statusMatch)
          return Promise.resolve({ docs: filtered })
        }
        return Promise.resolve({ docs: [] })
      }),
      update: vi.fn().mockImplementation(({ collection, id, data }: any) => {
        if (collection === 'notification-logs') {
          const doc = inMemoryDb.find((d) => d.id === id)
          if (doc) {
            Object.assign(doc, data)
            return Promise.resolve(doc)
          }
        }
        return Promise.resolve(null)
      }),
    }
    repository = new NotificationRepository(mockPayload as any)
  })

  it('Integration: PostgreSQL Atomic Reaper identifies stale processing jobs without active lease and transitions them to failed', async () => {
    const testJobId = `test_int_reap_${Date.now()}`

    // 1. Insert a stale processing job
    const staleDoc = {
      id: 101,
      notificationId: testJobId,
      referenceType: 'TEST',
      referenceId: '999',
      recipient: 'reap_test@example.com',
      channel: 'email',
      category: 'marketing',
      priority: 'normal',
      templateId: 'welcome_email',
      status: 'processing',
      attempts: 1,
    }
    inMemoryDb.push(staleDoc)

    // Verify it is in status 'processing' and no lease exists
    const leaseCheck = await MaintenanceLeaseService.getActiveLease(mockPayload as any, `notification_job_${testJobId}`)
    expect(leaseCheck).toBeUndefined()

    // 2. Execute reapStaleProcessingJobs
    const reapedCount = await repository.reapStaleProcessingJobs(50)
    expect(reapedCount).toBe(1)

    // 3. Verify job in DB is now 'failed' with attempts = 1 and next_attempt_at in the future
    const res = inMemoryDb.find((d) => d.id === 101)
    expect(res).toBeDefined()
    expect(res.status).toBe('failed')
    expect(Number(res.attempts)).toBe(1) // Preserved, not incremented
    expect(res.nextAttemptAt).toBeDefined()
    expect(res.lastError).toContain('Worker process crashed or lease expired while processing')
  })

  it('Integration: PostgreSQL Atomic Reaper does NOT touch processing jobs with active unexpired lease in maintenance_leases', async () => {
    const testActiveJobId = `test_int_reap_active_${Date.now()}`

    // 1. Insert a processing job
    const activeDoc = {
      id: 102,
      notificationId: testActiveJobId,
      referenceType: 'TEST',
      referenceId: '999',
      recipient: 'active_lease@example.com',
      channel: 'email',
      category: 'marketing',
      priority: 'normal',
      templateId: 'welcome_email',
      status: 'processing',
      attempts: 1,
    }
    inMemoryDb.push(activeDoc)

    // 2. Acquire active lease for Worker Alpha for 60 seconds
    const acquired = await MaintenanceLeaseService.acquireLease(mockPayload as any, `notification_job_${testActiveJobId}`, 'worker_alpha', 60000)
    expect(acquired).toBe(true)

    // 3. Execute reapStaleProcessingJobs
    const reapedCount = await repository.reapStaleProcessingJobs(50)
    expect(reapedCount).toBe(0)

    // 4. Verify job in DB is STILL 'processing' and untouched
    const res = inMemoryDb.find((d) => d.id === 102)
    expect(res).toBeDefined()
    expect(res.status).toBe('processing')
    expect(Number(res.attempts)).toBe(1)
    expect(res.lastError).toBeUndefined()

    // Clean up lease
    await MaintenanceLeaseService.releaseLease(mockPayload as any, `notification_job_${testActiveJobId}`, 'worker_alpha')
  })
})
