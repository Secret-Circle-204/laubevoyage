import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DepartureSlotHelper, type DepartureSlotLifecycleStatus } from '@/domains/experience/departure-slot'
import { ExperienceRepository } from '@/domains/experience/repository'
import type { DepartureSlotEntity } from '@/domains/experience/types'
import type { ExperienceAggregate } from '@/domains/experience/aggregate'

describe('BATCH 17F — Departure Slots Lifecycle & Control Surface Invariants', () => {
  describe('1. DepartureSlotHelper Domain Invariants (Creation)', () => {
    it('creates a valid DepartureSlotEntity with authoritative initial state', () => {
      const slot = DepartureSlotHelper.createSlot(
        'DEP-10-2026-10-01-0900',
        10,
        '2026-10-01',
        25,
        '09:00',
        1500,
      )

      expect(slot).toEqual({
        departureId: 'DEP-10-2026-10-01-0900',
        experienceId: 10,
        date: '2026-10-01',
        startTime: '09:00',
        priceOverrideEGP: 1500,
        capacityTotal: 25,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 25,
        version: 1,
        status: 'available',
      })
    })

    it('rejects creation if date is invalid or missing', () => {
      expect(() =>
        DepartureSlotHelper.createSlot('DEP-10-invalid', 10, 'invalid-date', 20),
      ).toThrowError(/Invalid slot date/i)
    })

    it('rejects creation if capacityTotal is < 1 or non-integer', () => {
      expect(() =>
        DepartureSlotHelper.createSlot('DEP-10-2026-10-01-0000', 10, '2026-10-01', 0),
      ).toThrowError(/Invalid capacityTotal/i)

      expect(() =>
        DepartureSlotHelper.createSlot('DEP-10-2026-10-01-0000', 10, '2026-10-01', -5),
      ).toThrowError(/Invalid capacityTotal/i)
    })

    it('rejects creation if priceOverrideEGP is negative', () => {
      expect(() =>
        DepartureSlotHelper.createSlot('DEP-10-2026-10-01-0000', 10, '2026-10-01', 10, '09:00', -100),
      ).toThrowError(/Invalid priceOverrideEGP/i)
    })
  })

  describe('2. DepartureSlotHelper Domain Invariants (Update & Concurrency)', () => {
    const baseSlot: DepartureSlotEntity = {
      id: 50,
      departureId: 'DEP-10-2026-10-01-0900',
      experienceId: 10,
      date: '2026-10-01',
      startTime: '09:00',
      priceOverrideEGP: 1500,
      capacityTotal: 20,
      capacityReserved: 3,
      capacitySold: 5,
      capacityAvailable: 12,
      version: 2,
      status: 'available',
    }

    it('allows valid update and preserves optimistic concurrency version', () => {
      expect(() =>
        DepartureSlotHelper.validateUpdate(baseSlot, {
          capacityTotal: 25,
          version: 2,
        }),
      ).not.toThrow()
    })

    it('rejects update if version mismatch is detected (Optimistic Lock Failure)', () => {
      expect(() =>
        DepartureSlotHelper.validateUpdate(baseSlot, {
          capacityTotal: 25,
          version: 1, // Stale version
        }),
      ).toThrowError(/Concurrency conflict/i)
    })

    it('rejects reducing capacityTotal below reserved + sold seats', () => {
      // reserved (3) + sold (5) = 8 minimum required
      expect(() =>
        DepartureSlotHelper.validateUpdate(baseSlot, {
          capacityTotal: 7, // Below 8
          version: 2,
        }),
      ).toThrowError(/Cannot reduce capacityTotal \(7\) below currently reserved \(3\) \+ sold \(5\)/i)
    })

    it('rejects cancelling a slot if sold tickets exist', () => {
      expect(() =>
        DepartureSlotHelper.validateUpdate(baseSlot, {
          status: 'cancelled',
          version: 2,
        }),
      ).toThrowError(/Cannot cancel departure slot with 5 sold tickets/i)
    })
  })

  describe('3. Effective Price Resolution', () => {
    it('returns priceOverrideEGP when set', () => {
      const slot: DepartureSlotEntity = {
        departureId: 'DEP-1',
        experienceId: 1,
        date: '2026-10-01',
        priceOverrideEGP: 1200,
        capacityTotal: 10,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 10,
        version: 1,
        status: 'available',
      }
      expect(DepartureSlotHelper.calculateEffectivePrice(slot, 2000)).toBe(1200)
    })

    it('returns baseExperiencePrice when priceOverrideEGP is undefined', () => {
      const slot: DepartureSlotEntity = {
        departureId: 'DEP-1',
        experienceId: 1,
        date: '2026-10-01',
        priceOverrideEGP: undefined,
        capacityTotal: 10,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 10,
        version: 1,
        status: 'available',
      }
      expect(DepartureSlotHelper.calculateEffectivePrice(slot, 2000)).toBe(2000)
    })
  })

  describe('4. Repository Admin Operations (CRUD & Concurrency)', () => {
    let mockPayload: any
    let repository: ExperienceRepository

    beforeEach(() => {
      mockPayload = {
        find: vi.fn(),
        findByID: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      }
      repository = new ExperienceRepository(mockPayload)
    })

    it('creates departure slot with repository and persists to departure-slots collection', async () => {
      mockPayload.create.mockResolvedValue({
        id: 77,
        departureId: 'DEP-10-2026-11-01-0900',
        experience: 10,
        date: '2026-11-01',
        startTime: '09:00',
        capacityTotal: 30,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 30,
        version: 1,
        status: 'available',
      })

      const slot = await repository.createDepartureSlotAdmin({
        experienceId: 10,
        date: '2026-11-01',
        startTime: '09:00',
        capacityTotal: 30,
      })

      expect(slot.id).toBe(77)
      expect(slot.capacityAvailable).toBe(30)
      expect(mockPayload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'departure-slots',
          data: expect.objectContaining({
            departureId: 'DEP-10-2026-11-01-0900',
            capacityTotal: 30,
          }),
        }),
      )
    })

    it('updates departure slot with version incrementation and optimistic concurrency', async () => {
      mockPayload.findByID.mockResolvedValue({
        id: 88,
        departureId: 'DEP-10-2026-11-01-0900',
        experience: 10,
        date: '2026-11-01',
        startTime: '09:00',
        capacityTotal: 20,
        capacityReserved: 2,
        capacitySold: 2,
        capacityAvailable: 16,
        version: 3,
        status: 'available',
      })

      mockPayload.update.mockResolvedValue({
        id: 88,
        version: 4,
      })

      const updated = await repository.updateDepartureSlotAdmin(88, {
        capacityTotal: 25,
        version: 3,
      })

      expect(updated.version).toBe(4)
      expect(updated.capacityTotal).toBe(25)
      expect(updated.capacityAvailable).toBe(21) // 25 - 2 - 2
      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'departure-slots',
          id: 88,
          data: expect.objectContaining({
            capacityTotal: 25,
            version: 4,
          }),
        }),
      )
    })

    it('cancels departure slot cleanly when no active bookings exist', async () => {
      mockPayload.findByID.mockResolvedValue({
        id: 99,
        departureId: 'DEP-10-2026-11-01-0900',
        experience: 10,
        date: '2026-11-01',
        startTime: '09:00',
        capacityTotal: 20,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 20,
        version: 1,
        status: 'available',
      })

      mockPayload.find.mockResolvedValue({ totalDocs: 0, docs: [] })
      mockPayload.update.mockResolvedValue({ id: 99, status: 'cancelled', version: 2 })

      const cancelled = await repository.cancelDepartureSlotAdmin(99, 1)

      expect(cancelled.status).toBe('cancelled')
      expect(cancelled.version).toBe(2)
    })

    it('rejects cancellation when active bookings exist in bookings collection', async () => {
      mockPayload.findByID.mockResolvedValue({
        id: 99,
        departureId: 'DEP-10-2026-11-01-0900',
        experience: 10,
        date: '2026-11-01',
        startTime: '09:00',
        capacityTotal: 20,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 20,
        version: 1,
        status: 'available',
      })

      mockPayload.find.mockResolvedValue({
        totalDocs: 2,
        docs: [{ id: 'b1' }, { id: 'b2' }],
      })

      await expect(repository.cancelDepartureSlotAdmin(99, 1)).rejects.toThrowError(
        /2 active booking\(s\) exist/i,
      )
    })
  })

  describe('5. DepartureSlotHelper.resolveLifecycle Boundary Matrix & Invariants', () => {
    const experience = {
      id: 135,
      type: 'package' as const,
      packageMode: 'fixed_date',
      durationDays: 3,
    }
    const timezone = 'Africa/Cairo' // UTC+3 (2026-08-22)

    // Slot on 2026-08-22 @ 10:00 Africa/Cairo (= 07:00 UTC)
    // 3-day package ends on 2026-08-24 @ 12:00 Africa/Cairo (= 09:00 UTC)
    const baseSlot: DepartureSlotEntity = {
      id: 1,
      departureId: 'SLOT-135-2026-08-22',
      experienceId: 135,
      date: '2026-08-22',
      startTime: '10:00',
      capacityTotal: 20,
      capacityReserved: 0,
      capacitySold: 0,
      capacityAvailable: 20,
      version: 1,
      status: 'available',
    }

    it('classifies as upcoming and bookable when nowUtc < departureStartUtc', () => {
      // 2026-08-22 06:59:59 UTC (1 second before 10:00 AM Cairo)
      const nowUtc = new Date('2026-08-22T06:59:59.000Z')
      const result = DepartureSlotHelper.resolveLifecycle(baseSlot, experience, timezone, nowUtc)

      expect(result.lifecycleStatus).toBe('upcoming')
      expect(result.isBookable).toBe(true)
      expect(result.departureStartUtc.toISOString()).toBe('2026-08-22T07:00:00.000Z')
      expect(result.departureEndUtc.toISOString()).toBe('2026-08-24T09:00:00.000Z')
    })

    it('classifies as upcoming but NOT bookable if capacity is 0 (sold out)', () => {
      const nowUtc = new Date('2026-08-22T06:00:00.000Z')
      const soldOutSlot: DepartureSlotEntity = {
        ...baseSlot,
        capacityAvailable: 0,
        capacitySold: 20,
        status: 'sold_out',
      }
      const result = DepartureSlotHelper.resolveLifecycle(soldOutSlot, experience, timezone, nowUtc)

      expect(result.lifecycleStatus).toBe('upcoming')
      expect(result.isBookable).toBe(false)
    })

    it('classifies as started exactly at nowUtc === departureStartUtc', () => {
      // 2026-08-22 07:00:00 UTC (= 10:00 AM Cairo)
      const nowUtc = new Date('2026-08-22T07:00:00.000Z')
      const result = DepartureSlotHelper.resolveLifecycle(baseSlot, experience, timezone, nowUtc)

      expect(result.lifecycleStatus).toBe('started')
      expect(result.isBookable).toBe(false)
    })

    it('classifies as started during trip (Incident Scenario: 22 Aug 21:19 Cairo = 18:19 UTC)', () => {
      // 2026-08-22 18:19:00 UTC (= 21:19 Cairo)
      const nowUtc = new Date('2026-08-22T18:19:00.000Z')
      const result = DepartureSlotHelper.resolveLifecycle(baseSlot, experience, timezone, nowUtc)

      expect(result.lifecycleStatus).toBe('started')
      expect(result.isBookable).toBe(false)
    })

    it('classifies as completed exactly at nowUtc === departureEndUtc', () => {
      // 2026-08-24 09:00:00 UTC (= 12:00 PM Cairo on Day 3)
      const nowUtc = new Date('2026-08-24T09:00:00.000Z')
      const result = DepartureSlotHelper.resolveLifecycle(baseSlot, experience, timezone, nowUtc)

      expect(result.lifecycleStatus).toBe('completed')
      expect(result.isBookable).toBe(false)
    })

    it('classifies as completed when nowUtc > departureEndUtc', () => {
      // 2026-08-25 00:00:00 UTC
      const nowUtc = new Date('2026-08-25T00:00:00.000Z')
      const result = DepartureSlotHelper.resolveLifecycle(baseSlot, experience, timezone, nowUtc)

      expect(result.lifecycleStatus).toBe('completed')
      expect(result.isBookable).toBe(false)
    })

    it('classifies as cancelled when slot.status === "cancelled" irrespective of time', () => {
      const cancelledSlot: DepartureSlotEntity = {
        ...baseSlot,
        status: 'cancelled',
      }
      const beforeTrip = new Date('2026-08-20T00:00:00.000Z')
      const duringTrip = new Date('2026-08-22T18:19:00.000Z')
      const afterTrip = new Date('2026-08-26T00:00:00.000Z')

      expect(DepartureSlotHelper.resolveLifecycle(cancelledSlot, experience, timezone, beforeTrip).lifecycleStatus).toBe('cancelled')
      expect(DepartureSlotHelper.resolveLifecycle(cancelledSlot, experience, timezone, duringTrip).lifecycleStatus).toBe('cancelled')
      expect(DepartureSlotHelper.resolveLifecycle(cancelledSlot, experience, timezone, afterTrip).lifecycleStatus).toBe('cancelled')
    })

    it('fails fast if experience type is not package', () => {
      const invalidExp: any = { id: 1, type: 'daily_tour', durationMinutes: 180 }
      const nowUtc = new Date()
      expect(() =>
        DepartureSlotHelper.resolveLifecycle(baseSlot, invalidExp, timezone, nowUtc),
      ).toThrowError(/Departure slots are strictly supported for package experiences/i)
    })

    it('fails fast if experience is missing durationDays', () => {
      const invalidExp: any = { id: 1, type: 'package', packageMode: 'fixed_date' }
      const nowUtc = new Date()
      expect(() =>
        DepartureSlotHelper.resolveLifecycle(baseSlot, invalidExp, timezone, nowUtc),
      ).toThrowError(/missing authoritative durationDays >= 1/i)
    })

    it('fails fast if slot is missing startTime', () => {
      const slotNoTime: any = { ...baseSlot, startTime: undefined }
      const nowUtc = new Date()
      expect(() =>
        DepartureSlotHelper.resolveLifecycle(slotNoTime, experience, timezone, nowUtc),
      ).toThrowError(/missing or has invalid startTime/i)
    })

    it('fails fast if departureEndUtc <= departureStartUtc (single-day package with startTime >= 12:00)', () => {
      const singleDayExp = {
        id: 135,
        type: 'package' as const,
        packageMode: 'fixed_date',
        durationDays: 1,
      }
      const lateStartSlot: DepartureSlotEntity = {
        ...baseSlot,
        startTime: '14:00', // 14:00 is after 12:00 checkout on same calendar day
      }
      const nowUtc = new Date('2026-08-20T00:00:00.000Z')
      expect(() =>
        DepartureSlotHelper.resolveLifecycle(lateStartSlot, singleDayExp, timezone, nowUtc),
      ).toThrowError(/Temporal invariant violation: departureEndUtc .* must be strictly after departureStartUtc/i)
    })
  })

  describe('6. DepartureSlotHelper.calculateTemporalBoundary SSOT Invariants', () => {
    const timezone = 'Africa/Cairo' // UTC+3

    it('calculates valid UTC start and end instants for single-day package before 12:00', () => {
      const result = DepartureSlotHelper.calculateTemporalBoundary({
        date: '2026-08-22',
        startTime: '09:00',
        durationDays: 1,
        destinationTimezone: timezone,
      })

      // 09:00 Cairo (UTC+3) = 06:00 UTC
      expect(result.departureStartUtc.toISOString()).toBe('2026-08-22T06:00:00.000Z')
      // Single-day package ends at 12:00 Cairo = 09:00 UTC
      expect(result.departureEndUtc.toISOString()).toBe('2026-08-22T09:00:00.000Z')
      expect(result.departureEndUtc.getTime()).toBeGreaterThan(result.departureStartUtc.getTime())
    })

    it('rejects single-day package with startTime after 12:00 checkout (e.g. 20:00)', () => {
      expect(() =>
        DepartureSlotHelper.calculateTemporalBoundary({
          date: '2026-08-22',
          startTime: '20:00',
          durationDays: 1,
          destinationTimezone: timezone,
        }),
      ).toThrowError(/Temporal invariant violation: departureEndUtc .* must be strictly after departureStartUtc/i)
    })

    it('allows multi-day package (e.g. 3 days) starting in the evening (e.g. 20:00)', () => {
      const result = DepartureSlotHelper.calculateTemporalBoundary({
        date: '2026-08-22',
        startTime: '20:00',
        durationDays: 3,
        destinationTimezone: timezone,
      })

      // 20:00 Cairo = 17:00 UTC on 2026-08-22
      expect(result.departureStartUtc.toISOString()).toBe('2026-08-22T17:00:00.000Z')
      // 3-day package ends on 2026-08-24 @ 12:00 Cairo = 09:00 UTC
      expect(result.departureEndUtc.toISOString()).toBe('2026-08-24T09:00:00.000Z')
      expect(result.departureEndUtc.getTime()).toBeGreaterThan(result.departureStartUtc.getTime())
    })

    it('fails fast if missing required parameters', () => {
      expect(() =>
        DepartureSlotHelper.calculateTemporalBoundary({
          date: '',
          startTime: '09:00',
          durationDays: 1,
          destinationTimezone: timezone,
        }),
      ).toThrowError(/missing authoritative date/i)

      expect(() =>
        DepartureSlotHelper.calculateTemporalBoundary({
          date: '2026-08-22',
          startTime: '',
          durationDays: 1,
          destinationTimezone: timezone,
        }),
      ).toThrowError(/missing or has invalid startTime/i)

      expect(() =>
        DepartureSlotHelper.calculateTemporalBoundary({
          date: '2026-08-22',
          startTime: '09:00',
          durationDays: 0,
          destinationTimezone: timezone,
        }),
      ).toThrowError(/missing authoritative durationDays >= 1/i)

      expect(() =>
        DepartureSlotHelper.calculateTemporalBoundary({
          date: '2026-08-22',
          startTime: '09:00',
          durationDays: 1,
          destinationTimezone: '',
        }),
      ).toThrowError(/Missing authoritative destinationTimezone/i)
    })

    it('identifies corrupted slot through error catching and isCorrupted flag', () => {
      const corruptedSlot: DepartureSlotEntity = {
        id: 187,
        departureId: 'DEP-187',
        experienceId: 137,
        date: '2026-08-22',
        startTime: '23:00',
        capacityTotal: 20,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 20,
        version: 1,
        status: 'available',
      }

      const experience: ExperienceAggregate = {
        id: 137,
        title: 'Cairo Package',
        slug: 'cairo-package',
        cityId: 1,
        type: 'package',
        availability: 'available',
        price: 1000,
        version: 1,
        isActive: true,
        duration: { days: 1, nights: 1 },
        durationDays: 1,
        durationNights: 1,
        createdAt: '2026-08-22T00:00:00.000Z',
        updatedAt: '2026-08-22T00:00:00.000Z',
      }

      // Resolving lifecycle directly throws temporal invariant violation
      expect(() =>
        DepartureSlotHelper.resolveLifecycle(corruptedSlot, experience, timezone, new Date('2026-08-23T12:00:00Z')),
      ).toThrowError(/Temporal invariant violation/i)

      // When caught in application layer, it flags isCorrupted and defaults lifecycleStatus to cancelled
      let isCorrupted = false
      let lifecycleStatus: DepartureSlotLifecycleStatus = 'upcoming'
      try {
        const res = DepartureSlotHelper.resolveLifecycle(corruptedSlot, experience, timezone, new Date('2026-08-23T12:00:00Z'))
        lifecycleStatus = res.lifecycleStatus
      } catch {
        isCorrupted = true
        lifecycleStatus = 'cancelled'
      }

      expect(isCorrupted).toBe(true)
      expect(lifecycleStatus).toBe('cancelled')
    })
  })
})

