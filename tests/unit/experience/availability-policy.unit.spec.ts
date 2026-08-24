import { describe, it, expect } from 'vitest'
import { AvailabilityPolicy } from '@/domains/experience/availability-policy'
import { BlackoutPolicy } from '@/domains/experience/blackout-policy'
import { ExperiencePolicy } from '@/domains/experience/policy'
import type { DepartureSlotEntity } from '@/domains/experience/types'

describe('Experience Domain: Availability, Bookability & Blackout Policy Unit Tests', () => {
  const mockSlot: DepartureSlotEntity = {
    departureId: 'dep_101',
    experienceId: 1,
    date: '2026-08-01',
    priceOverrideEGP: 2000,
    capacityTotal: 10,
    capacityReserved: 2,
    capacitySold: 3,
    capacityAvailable: 5,
    version: 1,
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
    const result = BlackoutPolicy.isDateBlackedOut('2026-08-01', '', blackouts)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('BLACKED_OUT')
  })

  describe('ExperiencePolicy.isDepartureBookable (Chronological Bookability Invariants)', () => {
    it('REGRESSION GUARD: Incident #2 - should strictly reject Daily Tour requested after start/end time (09:00 tour requested at 18:00)', () => {
      // Server clock: 2026-08-22 18:00 Cairo Time (+03:00) => 2026-08-22T15:00:00.000Z
      const simulatedNow = new Date('2026-08-22T15:00:00.000Z')

      const result = ExperiencePolicy.isDepartureBookable(
        {
          type: 'daily_tour',
          date: '2026-08-22',
          startTime: '09:00', // 09:00 Cairo Time => 2026-08-22T06:00:00.000Z (Started 9h ago, finished 6h ago)
          durationMinutes: 180,
          timezone: 'Africa/Cairo',
        },
        simulatedNow,
      )

      expect(result.allowed).toBe(false)
      expect(['DEPARTURE_IN_PAST', 'DEPARTURE_COMPLETED']).toContain(result.code)
      expect(result.reason).toContain('already')
    })

    it('should allow Daily Tour in future (09:00 tour evaluated at 08:30 on same day)', () => {
      // Server clock: 2026-08-22 08:30 Cairo Time => 2026-08-22T05:30:00.000Z
      const simulatedNow = new Date('2026-08-22T05:30:00.000Z')

      const result = ExperiencePolicy.isDepartureBookable(
        {
          type: 'daily_tour',
          date: '2026-08-22',
          startTime: '09:00',
          durationMinutes: 180,
          timezone: 'Africa/Cairo',
        },
        simulatedNow,
      )

      expect(result.allowed).toBe(true)
    })

    it('should reject Daily Tour in progress (09:00 tour evaluated at 09:30)', () => {
      // Server clock: 2026-08-22 09:30 Cairo Time => 2026-08-22T06:30:00.000Z
      const simulatedNow = new Date('2026-08-22T06:30:00.000Z')

      const result = ExperiencePolicy.isDepartureBookable(
        {
          type: 'daily_tour',
          date: '2026-08-22',
          startTime: '09:00',
          durationMinutes: 180,
          timezone: 'Africa/Cairo',
        },
        simulatedNow,
      )

      expect(result.allowed).toBe(false)
      expect(result.code).toBe('DEPARTURE_IN_PAST')
    })

    describe('Strict Millisecond Boundary Invariant Tests (Admission Cutoff)', () => {
      // 09:00 Cairo Time (+03:00) => 2026-08-22T06:00:00.000Z (epoch: 1787378400000)
      const startInstantEpoch = new Date('2026-08-22T06:00:00.000Z').getTime()

      const baseParams = {
        type: 'daily_tour' as const,
        date: '2026-08-22',
        startTime: '09:00',
        durationMinutes: 180,
        timezone: 'Africa/Cairo',
      }

      it('start - 1ms -> BOOKABLE', () => {
        const simulatedNow = new Date(startInstantEpoch - 1)
        const result = ExperiencePolicy.isDepartureBookable(baseParams, simulatedNow)
        expect(result.allowed).toBe(true)
      })

      it('start exactly (0ms) -> DEPARTURE_IN_PAST (UNBOOKABLE)', () => {
        const simulatedNow = new Date(startInstantEpoch)
        const result = ExperiencePolicy.isDepartureBookable(baseParams, simulatedNow)
        expect(result.allowed).toBe(false)
        expect(result.code).toBe('DEPARTURE_IN_PAST')
      })

      it('start + 1ms -> DEPARTURE_IN_PAST (UNBOOKABLE)', () => {
        const simulatedNow = new Date(startInstantEpoch + 1)
        const result = ExperiencePolicy.isDepartureBookable(baseParams, simulatedNow)
        expect(result.allowed).toBe(false)
        expect(result.code).toBe('DEPARTURE_IN_PAST')
      })
    })

    describe('Daily Tour Timeline Invariants (09:00 Cairo Tour with 3h Duration)', () => {
      const baseParams = {
        type: 'daily_tour' as const,
        date: '2026-08-22',
        startTime: '09:00',
        durationMinutes: 180,
        timezone: 'Africa/Cairo',
      }

      it('08:59:59 (1s before departure) -> BOOKABLE', () => {
        const now = new Date('2026-08-22T05:59:59.000Z') // 08:59:59 Cairo
        const result = ExperiencePolicy.isDepartureBookable(baseParams, now)
        expect(result.allowed).toBe(true)
      })

      it('09:00:00 (departure start moment) -> FORBIDDEN (DEPARTURE_IN_PAST)', () => {
        const now = new Date('2026-08-22T06:00:00.000Z') // 09:00:00 Cairo
        const result = ExperiencePolicy.isDepartureBookable(baseParams, now)
        expect(result.allowed).toBe(false)
        expect(result.code).toBe('DEPARTURE_IN_PAST')
      })

      it('09:00:01 (1s after departure) -> FORBIDDEN (DEPARTURE_IN_PAST)', () => {
        const now = new Date('2026-08-22T06:00:01.000Z') // 09:00:01 Cairo
        const result = ExperiencePolicy.isDepartureBookable(baseParams, now)
        expect(result.allowed).toBe(false)
        expect(result.code).toBe('DEPARTURE_IN_PAST')
      })

      it('10:00:00 (1h into tour) -> FORBIDDEN (DEPARTURE_IN_PAST)', () => {
        const now = new Date('2026-08-22T07:00:00.000Z') // 10:00:00 Cairo
        const result = ExperiencePolicy.isDepartureBookable(baseParams, now)
        expect(result.allowed).toBe(false)
        expect(result.code).toBe('DEPARTURE_IN_PAST')
      })

      it('11:59:59 (1s before completion) -> FORBIDDEN (DEPARTURE_IN_PAST)', () => {
        const now = new Date('2026-08-22T08:59:59.000Z') // 11:59:59 Cairo
        const result = ExperiencePolicy.isDepartureBookable(baseParams, now)
        expect(result.allowed).toBe(false)
        expect(result.code).toBe('DEPARTURE_IN_PAST')
      })

      it('12:00:00 (tour completion instant) -> FORBIDDEN (DEPARTURE_COMPLETED)', () => {
        const now = new Date('2026-08-22T09:00:00.000Z') // 12:00:00 Cairo
        const result = ExperiencePolicy.isDepartureBookable(baseParams, now)
        expect(result.allowed).toBe(false)
        expect(result.code).toBe('DEPARTURE_COMPLETED')
      })
    })

    it('should reject Package Tour whose departure date is in the past', () => {
      const simulatedNow = new Date('2026-08-23T12:00:00.000Z')

      const result = ExperiencePolicy.isDepartureBookable(
        {
          type: 'package',
          date: '2026-08-20',
          endDate: '2026-08-22',
          timezone: 'Africa/Cairo',
        },
        simulatedNow,
      )

      expect(result.allowed).toBe(false)
      expect(['DEPARTURE_IN_PAST', 'DEPARTURE_COMPLETED']).toContain(result.code)
    })

    it('should allow Package Tour starting in the future', () => {
      const simulatedNow = new Date('2026-08-22T10:00:00.000Z')

      const result = ExperiencePolicy.isDepartureBookable(
        {
          type: 'package',
          date: '2026-09-01',
          endDate: '2026-09-05',
          timezone: 'Africa/Cairo',
        },
        simulatedNow,
      )

      expect(result.allowed).toBe(true)
    })
  })
})

