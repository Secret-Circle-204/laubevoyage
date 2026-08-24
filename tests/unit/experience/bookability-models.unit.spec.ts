import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExperiencePolicy } from '@/domains/experience/policy'
import { ExperienceService } from '@/domains/experience/service'
import { BookableDeparture } from '@/domains/experience/bookable-departure'

describe('Phase P0-F: Bookable Departure Models (Strict Model Separation & Zero Leakage)', () => {
  const timezone = 'Africa/Cairo'
  // Fixed simulated reference time: 2026-08-22 15:00:00 UTC (18:00:00 Africa/Cairo)
  const now = new Date('2026-08-22T15:00:00Z')

  describe('1. Flexible Package Bookability Model (User-Selected Start Date & ZERO Slots)', () => {
    it('should approve valid future start date with ZERO departure slots in DB', () => {
      const result = ExperiencePolicy.isFlexiblePackageStartDateBookable(
        {
          startDate: '2026-08-25',
          durationDays: 4,
          blackouts: [],
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(true)
    })

    it('should approve today start date when today is the local date in destination timezone', () => {
      const result = ExperiencePolicy.isFlexiblePackageStartDateBookable(
        {
          startDate: '2026-08-22',
          durationDays: 4,
          blackouts: [],
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(true)
    })

    it('should reject a start date in the past', () => {
      const result = ExperiencePolicy.isFlexiblePackageStartDateBookable(
        {
          startDate: '2026-08-21',
          durationDays: 4,
          blackouts: [],
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(false)
      expect(result.code).toBe('DEPARTURE_IN_PAST')
    })

    it('should reject a start date that is blacked out', () => {
      const result = ExperiencePolicy.isFlexiblePackageStartDateBookable(
        {
          startDate: '2026-08-25',
          durationDays: 4,
          blackouts: [{ date: '2026-08-25', reason: 'Maintenance' }],
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(false)
      expect(result.code).toBe('BLACKED_OUT')
    })

    it('findFirstBookableFlexibleStartDate should skip blacked out today and return next valid date', () => {
      const firstDate = ExperiencePolicy.findFirstBookableFlexibleStartDate(
        {
          durationDays: 4,
          blackouts: [
            { date: '2026-08-22', reason: 'National Holiday' },
            { date: '2026-08-23', reason: 'Maintenance' },
          ],
          timezone,
        },
        now,
      )

      expect(firstDate).toBe('2026-08-24')
    })
  })

  describe('2. Daily Tour Bookability Model (Daily Schedules & Temporal Guard)', () => {
    it('should reject 09:00 departure on today when current time is 18:00 (DEPARTURE_IN_PAST)', () => {
      const result = ExperiencePolicy.isDailyTourDepartureBookable(
        {
          date: '2026-08-22',
          startTime: '09:00',
          durationMinutes: 180,
          blackouts: [],
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(false)
      expect(result.code).toBe('DEPARTURE_COMPLETED')
    })

    it('should approve tomorrow 09:00 departure for daily tour', () => {
      const result = ExperiencePolicy.isDailyTourDepartureBookable(
        {
          date: '2026-08-23',
          startTime: '09:00',
          durationMinutes: 180,
          blackouts: [],
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(true)
    })

    it('findFirstBookableDailyTourDeparture should deterministically advance past expired today to tomorrow', () => {
      const firstDeparture = ExperiencePolicy.findFirstBookableDailyTourDeparture(
        {
          schedules: [{ startTime: '09:00' }],
          durationMinutes: 180,
          blackouts: [],
          timezone,
        },
        now,
      )

      expect(firstDeparture).toEqual({
        date: '2026-08-23',
        startTime: '09:00',
      })
    })
  })

  describe('3. Fixed Package Bookability Model (Physical Departure Slots)', () => {
    it('should approve active future slot with available capacity', () => {
      const result = ExperiencePolicy.isFixedPackageSlotBookable(
        {
          date: '2026-11-01',
          startTime: '09:00',
          slotStatus: 'available',
          capacityAvailable: 5,
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(true)
    })

    it('should reject slot with 0 capacity as SLOT_SOLD_OUT', () => {
      const result = ExperiencePolicy.isFixedPackageSlotBookable(
        {
          date: '2026-11-01',
          startTime: '09:00',
          slotStatus: 'available',
          capacityAvailable: 0,
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(false)
      expect(result.code).toBe('SLOT_SOLD_OUT')
    })

    it('should reject slot in the past as DEPARTURE_IN_PAST', () => {
      const result = ExperiencePolicy.isFixedPackageSlotBookable(
        {
          date: '2026-08-20',
          startTime: '09:00',
          slotStatus: 'available',
          capacityAvailable: 5,
          timezone,
        },
        now,
      )

      expect(result.allowed).toBe(false)
      expect(result.code).toBe('DEPARTURE_IN_PAST')
    })
  })

  describe('4. ExperienceService Preview Resolution (Model Isolation & Zero Slot Leakage)', () => {
    it('should resolve preview for Flexible Package without querying departure slots table', async () => {
      const mockExperience = {
        id: 42,
        title: 'Desert Safari 4 Days Flexible',
        type: 'package' as const,
        packageMode: 'flexible_date' as const,
        durationDays: 4,
        durationNights: 3,
        price: 12000,
        blackouts: [],
        cityId: 101,
        availability: 'available',
        isActive: true,
      }

      const mockQueries = {
        getById: vi.fn().mockResolvedValue(mockExperience),
        findDepartureSlotByDate: vi.fn(), // MUST NOT be called!
        findDepartureSlotById: vi.fn(),
        findSlotsByExperienceId: vi.fn(),
        findDefaultSlot: vi.fn(),
        saveDepartureSlot: vi.fn(),
        getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
      }

      const mockRepository = {
        findById: vi.fn().mockResolvedValue(mockExperience),
        findBySlug: vi.fn().mockResolvedValue(mockExperience),
        findSlotsByExperienceId: vi.fn().mockResolvedValue([]),
        getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
        findTimezoneByCityId: vi.fn().mockResolvedValue('Africa/Cairo'),
      }

      const mockWorkflowEngine = {
        repository: mockRepository,
        queries: mockQueries,
        priceResolver: {
          resolve: vi.fn().mockReturnValue(12000),
        },
        departureAssembler: {
          assemble: vi.fn(),
        },
        validator: {
          validateAggregate: vi.fn(),
        },
      }

      const service = new ExperienceService(
        mockRepository as any,
        mockWorkflowEngine as any,
      )

      const departure = await service.resolvePreviewDepartureByDate(42, '2026-08-25', '', now)

      expect(departure).toBeInstanceOf(BookableDeparture)
      expect(departure.status).toBe('available')
      expect(departure.effectiveBasePrice).toBe(12000)
      expect(mockQueries.findDepartureSlotByDate).not.toHaveBeenCalled()
    })
  })
})
