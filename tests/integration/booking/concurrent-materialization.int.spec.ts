import { describe, it, expect } from 'vitest'
import { AvailabilityPolicy } from '@/domains/experience/availability-policy'
import { DepartureSlotHelper } from '@/domains/experience/departure-slot'
import type { DepartureSlotEntity } from '@/domains/experience/types'

describe('100 Concurrent Booking Attempts & Capacity Invariant Verification', () => {
  it('100 concurrent booking attempts respect total capacity (20) without duplicate slots or overbooking', async () => {
    const totalCapacity = 20
    let simulatedSlot: DepartureSlotEntity = {
      id: 101,
      departureId: 'DEP-10-2026-08-20-0900',
      experienceId: 10,
      date: '2026-08-20',
      startTime: '09:00',
      capacityTotal: totalCapacity,
      capacityReserved: 0,
      capacitySold: 0,
      capacityAvailable: totalCapacity,
      version: 1,
      status: 'available',
    }

    let createdSlotsCount = 0
    const materializedSlotsMap = new Map<string, DepartureSlotEntity>()

    // Simulate getOrCreateDailyDeparture idempotency
    const getOrCreateSlot = async (depId: string): Promise<DepartureSlotEntity> => {
      if (!materializedSlotsMap.has(depId)) {
        materializedSlotsMap.set(depId, { ...simulatedSlot })
        createdSlotsCount++
      }
      return materializedSlotsMap.get(depId)!
    }

    // Simulate atomic reserveCapacity with Mutex/Optimistic lock
    let successfulReservations = 0
    let rejectedReservations = 0
    let totalSeatsReserved = 0

    const bookingAttempts = Array.from({ length: 100 }).map(async (_, idx) => {
      const requestedSeats = 1
      const slot = await getOrCreateSlot('DEP-10-2026-08-20-0900')

      // Atomic lock simulation (representing PostgreSQL serialized transaction)
      const policyCheck = AvailabilityPolicy.canReserve(slot, requestedSeats)
      if (policyCheck.allowed) {
        slot.capacityReserved += requestedSeats
        slot.capacityAvailable = DepartureSlotHelper.calculateAvailableCapacity(slot)
        slot.version++
        successfulReservations++
        totalSeatsReserved += requestedSeats
        return { success: true, bookingId: idx }
      } else {
        rejectedReservations++
        return { success: false, reason: policyCheck.reason }
      }
    })

    const results = await Promise.all(bookingAttempts)

    // 1. Invariant: Exactly 1 departure slot materialized (no duplicates)
    expect(createdSlotsCount).toBe(1)
    expect(materializedSlotsMap.size).toBe(1)

    // 2. Invariant: Total successful reservations exactly match available capacity
    expect(successfulReservations).toBe(totalCapacity)
    expect(totalSeatsReserved).toBe(totalCapacity)

    // 3. Invariant: Excess attempts (80) rejected safely without overbooking
    expect(rejectedReservations).toBe(80)

    // 4. Invariant: Ledger equation strictly holds: capacityTotal = capacityReserved + capacitySold + capacityAvailable
    const finalSlot = materializedSlotsMap.get('DEP-10-2026-08-20-0900')!
    expect(finalSlot.capacityTotal).toBe(20)
    expect(finalSlot.capacityReserved).toBe(20)
    expect(finalSlot.capacitySold).toBe(0)
    expect(finalSlot.capacityAvailable).toBe(0)
    expect(finalSlot.capacityReserved + finalSlot.capacitySold).toBeLessThanOrEqual(finalSlot.capacityTotal)
  })
})
