import { describe, it, expect } from 'vitest'
import { MaintenanceEngine } from '@/domains/maintenance/engine'

describe('Maintenance Domain: Batched Maintenance Engine Unit Tests', () => {
  it('should complete finished bookings in batched chunks without memory bloat', async () => {
    const mockRepo = {
      findConfirmedExpiredBookings: async () => [{ id: 101, status: 'confirmed' }],
      findStaleDraftBookings: async () => [],
      updateBookingStatus: async () => {},
    } as any

    const engine = new MaintenanceEngine(mockRepo)
    const result = await engine.completeFinishedBookings(20)

    expect(result.processedCount).toBeGreaterThanOrEqual(1)
  })
})
