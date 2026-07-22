import { describe, it, expect } from 'vitest'
import { MaintenanceLeaseService } from '@/domains/maintenance/lease-service'

describe('Maintenance Domain: Distributed Lease Service Unit Tests', () => {
  it('should acquire lease lock and prevent secondary worker from acquiring locked job', () => {
    const jobName = 'complete_finished_bookings'
    const workerA = 'worker_node_A'
    const workerB = 'worker_node_B'

    const acquiredA = MaintenanceLeaseService.acquireLease(jobName, workerA, 60000)
    expect(acquiredA).toBe(true)

    const acquiredB = MaintenanceLeaseService.acquireLease(jobName, workerB, 60000)
    expect(acquiredB).toBe(false) // Locked by Worker A!

    MaintenanceLeaseService.releaseLease(jobName, workerA)

    const acquiredBAfterRelease = MaintenanceLeaseService.acquireLease(jobName, workerB, 60000)
    expect(acquiredBAfterRelease).toBe(true)
  })
})
