import { describe, it, expect } from 'vitest'
import { AvailabilityPolicy } from '@/domains/experience/availability-policy'
import { BlackoutPolicy } from '@/domains/experience/blackout-policy'
import type { DepartureSlotEntity } from '@/domains/experience/types'

describe('Experience Domain: Availability & Blackout Policy Unit Tests', () => {
  const mockSlot: DepartureSlotEntity = {
    departureId: 'dep_101',
    experienceId: 1,
    date: '2026-08-01',
    basePriceEGP: 2000,
    capacityTotal: 10,
    capacityReserved: 2,
    capacitySold: 3,
    capacityAvailable: 5,
    version: 1,
    isBlackedOut: false,
    status: 'available',
  }

  it('should allow valid capacity reservation within available bounds', () => {
    const result = AvailabilityPolicy.canReserve(mockSlot, 3)
    expect(result.allowed).toBe(true)
  })

  it('should disallow capacity reservation exceeding available seats', () => {
    const result = AvailabilityPolicy.canReserve(mockSlot, 10)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('INSUFFICIENT_CAPACITY')
  })

  it('should detect blacked out dates in BlackoutPolicy', () => {
    const blackouts = [
      { date: '2026-08-01', reason: 'National Holiday', createdBy: 'admin', createdAt: '2026-07-22' },
    ]
    const result = BlackoutPolicy.isDateBlackedOut('2026-08-01', blackouts)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('BLACKED_OUT')
  })
})
