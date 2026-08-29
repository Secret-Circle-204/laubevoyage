import { describe, it, expect, vi } from 'vitest'
import { DataRetentionService } from '@/domains/maintenance/retention'

describe('Maintenance Domain: DataRetentionService & Telemetry Retention Specs', () => {
  const BASE_TIME = new Date('2026-08-27T12:00:00.000Z')

  it('Tier 1: should prune routine no-op logs (status: success, itemsProcessed: 0) older than 14 days', async () => {
    const deletedIds: number[] = []
    const mockPayload = {
      find: vi.fn().mockImplementation(async ({ collection, where }) => {
        if (collection === 'maintenance-logs') {
          // Verify exact where clauses for Tier 1
          const statusEq = where.and.find((c: any) => c.status?.equals === 'success')
          const itemsEq = where.and.find((c: any) => c.itemsProcessed?.equals === 0)
          const executedAtLt = where.and.find((c: any) => c.executedAt?.less_than !== undefined)

          if (statusEq && itemsEq && executedAtLt) {
            return {
              docs: [
                { id: 101, executionId: 'exec_old_noop_1' },
                { id: 102, executionId: 'exec_old_noop_2' },
              ],
            }
          }
        }
        return { docs: [] }
      }),
      delete: vi.fn().mockImplementation(async ({ collection, id }) => {
        if (collection === 'maintenance-logs') {
          deletedIds.push(id)
        }
        return { id }
      }),
    } as any

    const service = new DataRetentionService(mockPayload)
    const result = await service.purgeExpiredMaintenanceLogs(BASE_TIME)

    expect(result.purgedLogs).toBe(2)
    expect(deletedIds).toEqual([101, 102])
  })

  it('Tier 2: should retain meaningful success logs (itemsProcessed > 0) up to 90 days and prune thereafter', async () => {
    const deletedIds: number[] = []
    const mockPayload = {
      find: vi.fn().mockImplementation(async ({ collection, where }) => {
        if (collection === 'maintenance-logs') {
          const statusEq = where.and.find((c: any) => c.status?.equals === 'success')
          const itemsGt = where.and.find((c: any) => c.itemsProcessed?.greater_than === 0)
          const executedAtLt = where.and.find((c: any) => c.executedAt?.less_than !== undefined)

          if (statusEq && itemsGt && executedAtLt) {
            // Cutoff should be 90 days prior
            const cutoffDate = new Date(executedAtLt.executedAt.less_than)
            const diffDays = Math.round((BASE_TIME.getTime() - cutoffDate.getTime()) / (24 * 60 * 60 * 1000))
            expect(diffDays).toBe(90)

            return {
              docs: [{ id: 201, executionId: 'exec_old_meaningful_booking_comp' }],
            }
          }
        }
        return { docs: [] }
      }),
      delete: vi.fn().mockImplementation(async ({ collection, id }) => {
        if (collection === 'maintenance-logs') {
          deletedIds.push(id)
        }
        return { id }
      }),
    } as any

    const service = new DataRetentionService(mockPayload)
    const result = await service.purgeExpiredMaintenanceLogs(BASE_TIME)

    expect(result.purgedLogs).toBe(1)
    expect(deletedIds).toContain(201)
  })

  it('Tier 3: should retain failed and partial_success logs up to 90 days and prune thereafter', async () => {
    const deletedIds: number[] = []
    const mockPayload = {
      find: vi.fn().mockImplementation(async ({ collection, where }) => {
        if (collection === 'maintenance-logs') {
          const statusIn = where.and.find((c: any) => c.status?.in !== undefined)
          const executedAtLt = where.and.find((c: any) => c.executedAt?.less_than !== undefined)

          if (statusIn && executedAtLt) {
            expect(statusIn.status.in).toEqual(['failed', 'partial_success'])
            const cutoffDate = new Date(executedAtLt.executedAt.less_than)
            const diffDays = Math.round((BASE_TIME.getTime() - cutoffDate.getTime()) / (24 * 60 * 60 * 1000))
            expect(diffDays).toBe(90)

            return {
              docs: [
                { id: 301, executionId: 'exec_failed_reconciliation' },
                { id: 302, executionId: 'exec_partial_success_holds' },
              ],
            }
          }
        }
        return { docs: [] }
      }),
      delete: vi.fn().mockImplementation(async ({ collection, id }) => {
        if (collection === 'maintenance-logs') {
          deletedIds.push(id)
        }
        return { id }
      }),
    } as any

    const service = new DataRetentionService(mockPayload)
    const result = await service.purgeExpiredMaintenanceLogs(BASE_TIME)

    expect(result.purgedLogs).toBe(2)
    expect(deletedIds).toEqual([301, 302])
  })

  it('Running Record & Current Execution Immunity: never targets status: running or fresh logs', async () => {
    const findQueries: any[] = []
    const mockPayload = {
      find: vi.fn().mockImplementation(async ({ collection, where }) => {
        if (collection === 'maintenance-logs') {
          findQueries.push(where)
        }
        return { docs: [] }
      }),
      delete: vi.fn(),
    } as any

    const service = new DataRetentionService(mockPayload)
    const result = await service.purgeExpiredMaintenanceLogs(BASE_TIME)

    expect(result.purgedLogs).toBe(0)
    expect(mockPayload.delete).not.toHaveBeenCalled()

    // Verify none of the queries query for status: 'running'
    for (const query of findQueries) {
      const runningEquals = query.and.some((c: any) => c.status?.equals === 'running')
      const runningIn = query.and.some((c: any) => c.status?.in?.includes('running'))
      expect(runningEquals).toBe(false)
      expect(runningIn).toBe(false)
    }
  })

  it('Full Orchestration: purgeExpiredHoldsAndSessions purges unverified customers and expired logs in one workflow pass', async () => {
    const mockPayload = {
      find: vi.fn().mockImplementation(async ({ collection }) => {
        if (collection === 'customers') {
          return { docs: [{ id: 99, email: 'unverified@laube.com' }] }
        }
        if (collection === 'maintenance-logs') {
          return { docs: [{ id: 501, executionId: 'exec_old_1' }] }
        }
        return { docs: [] }
      }),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    } as any

    const service = new DataRetentionService(mockPayload)
    const result = await service.purgeExpiredHoldsAndSessions(BASE_TIME)

    // 1 customer + (1 log * 3 tiers = 3 logs) = 4 total purged
    expect(result.purgedCount).toBe(4)
    expect(mockPayload.delete).toHaveBeenCalledTimes(4)
  })
})
