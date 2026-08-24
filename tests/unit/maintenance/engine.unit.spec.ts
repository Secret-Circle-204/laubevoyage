import { describe, it, expect, vi } from 'vitest'
import { MaintenanceEngine } from '@/domains/maintenance/engine'

describe('Maintenance Domain: Batched Maintenance Engine Unit Tests', () => {
  it('should complete finished bookings in batched chunks without memory bloat', async () => {
    const mockRepo = {
      findConfirmedExpiredBookings: vi.fn()
        .mockResolvedValueOnce([{ id: 101, status: 'confirmed' }])
        .mockResolvedValueOnce([]),
      findStaleDraftBookings: async () => [],
      updateBookingStatus: async () => {},
    } as any

    const mockBookingService = {
      complete: vi.fn().mockResolvedValue({ id: 101, status: 'completed' }),
    } as any

    const engine = new MaintenanceEngine(mockRepo, mockBookingService)
    const result = await engine.completeFinishedBookings(20)

    expect(result.processedCount).toBe(1)
    expect(mockBookingService.complete).toHaveBeenCalledWith(101)
  })

  it('should return 0 processed count when no expired bookings exist (Idempotency Guarantee)', async () => {
    const mockRepo = {
      findConfirmedExpiredBookings: vi.fn().mockResolvedValue([]),
      findStaleDraftBookings: async () => [],
    } as any

    const mockBookingService = {
      complete: vi.fn(),
    } as any

    const engine = new MaintenanceEngine(mockRepo, mockBookingService)
    const result = await engine.completeFinishedBookings(20)

    expect(result.processedCount).toBe(0)
    expect(mockBookingService.complete).not.toHaveBeenCalled()
  })
})

