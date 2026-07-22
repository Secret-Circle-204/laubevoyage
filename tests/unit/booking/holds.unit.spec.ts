import { describe, it, expect } from 'vitest'
import { CapacityHoldService } from '@/domains/booking/capacity-hold'
import { PointHoldService } from '@/domains/loyalty/point-hold'

describe('Layer 4: Capacity & Point Hold Unit Tests', () => {
  describe('CapacityHoldService', () => {
    it('should create an active capacity hold expiring in 15 minutes by default', () => {
      const now = Date.now()
      const hold = CapacityHoldService.createHold({
        bookingId: 101,
        customerId: 5,
        experienceId: 12,
        seats: 2,
        date: '2026-08-01',
      })

      expect(hold.status).toBe('active')
      expect(hold.seats).toBe(2)

      const expiresAtMs = new Date(hold.expiresAt).getTime()
      const duration = expiresAtMs - now
      // Should be approximately 15 minutes (900,000 ms)
      expect(duration).toBeGreaterThanOrEqual(899000)
      expect(duration).toBeLessThanOrEqual(901000)
    })

    it('should transition capacity hold through commit, release, and expire states', () => {
      const hold = CapacityHoldService.createHold({
        bookingId: 101,
        customerId: 5,
        experienceId: 12,
        seats: 2,
        date: '2026-08-01',
      })

      const committed = CapacityHoldService.commitHold(hold)
      expect(committed.status).toBe('committed')

      const released = CapacityHoldService.releaseHold(hold)
      expect(released.status).toBe('released')

      const expired = CapacityHoldService.expireHold(hold)
      expect(expired.status).toBe('expired')
    })
  })

  describe('PointHoldService', () => {
    it('should create an active point hold with 4-stage lifecycle', () => {
      const hold = PointHoldService.createHold({
        bookingId: 101,
        customerId: 5,
        pointsHeld: 200,
        valueEGP: 100,
      })

      expect(hold.status).toBe('held')
      expect(hold.pointsHeld).toBe(200)

      const committed = PointHoldService.commitHold(hold)
      expect(committed.status).toBe('committed')

      const released = PointHoldService.releaseHold(hold)
      expect(released.status).toBe('released')

      const expired = PointHoldService.expireHold(hold)
      expect(expired.status).toBe('expired')
    })
  })
})
