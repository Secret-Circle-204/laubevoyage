import { describe, it, expect, vi } from 'vitest'
import { formatExperienceDuration } from '@/domains/experience/duration-formatter'
import { ExperienceRepository } from '@/domains/experience/repository'

describe('P0-B Experience Contract & Duration Model Invariants (Hardened)', () => {
  describe('1. Canonical Duration Formatter (Fail-Fast & Zero Silent Fallbacks)', () => {
    it('formats daily tours in hours when divisible by 60', () => {
      expect(
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 420,
        }),
      ).toBe('7 Hours')

      expect(
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 60,
        }),
      ).toBe('1 Hour')

      expect(
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 120,
        }),
      ).toBe('2 Hours')
    })

    it('formats daily tours in compound hours and minutes when not divisible by 60', () => {
      expect(
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 90,
        }),
      ).toBe('1h 30m')

      expect(
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 150,
        }),
      ).toBe('2h 30m')
    })

    it('formats sub-hour daily tours in minutes', () => {
      expect(
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 45,
        }),
      ).toBe('45 Mins')

      expect(
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 15,
        }),
      ).toBe('15 Mins')
    })

    it('fails fast on daily tour with durationMinutes < 15, 0, null, or missing (no silent "Daily Tour" string fallback)', () => {
      expect(() =>
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 0,
        }),
      ).toThrow('[ExperienceDurationFormatter] Invalid daily_tour duration: durationMinutes must be an integer >= 15. Received: 0')

      expect(() =>
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: 10,
        }),
      ).toThrow('[ExperienceDurationFormatter] Invalid daily_tour duration: durationMinutes must be an integer >= 15. Received: 10')

      expect(() =>
        formatExperienceDuration({
          type: 'daily_tour',
          durationMinutes: null as any,
        }),
      ).toThrow('[ExperienceDurationFormatter] Invalid daily_tour duration: durationMinutes must be an integer >= 15. Received: null')
    })

    it('formats multi-day packages with days and nights', () => {
      expect(
        formatExperienceDuration({
          type: 'package',
          durationDays: 5,
          durationNights: 4,
        }),
      ).toBe('5 Days / 4 Nights')

      expect(
        formatExperienceDuration({
          type: 'package',
          durationDays: 2,
          durationNights: 1,
        }),
      ).toBe('2 Days / 1 Night')
    })

    it('formats packages without nights or with 0 nights as days only', () => {
      expect(
        formatExperienceDuration({
          type: 'package',
          durationDays: 3,
          durationNights: 0,
        }),
      ).toBe('3 Days')

      expect(
        formatExperienceDuration({
          type: 'package',
          durationDays: 1,
        }),
      ).toBe('1 Day')
    })

    it('fails fast on package with days < 1, 0, null, or missing (no silent "1 Day" fallback)', () => {
      expect(() =>
        formatExperienceDuration({
          type: 'package',
          durationDays: 0,
        }),
      ).toThrow('[ExperienceDurationFormatter] Invalid package duration: days must be an integer >= 1. Received: 0')

      expect(() =>
        formatExperienceDuration({
          type: 'package',
          durationDays: -1,
        }),
      ).toThrow('[ExperienceDurationFormatter] Invalid package duration: days must be an integer >= 1. Received: -1')

      expect(() =>
        formatExperienceDuration({
          type: 'package',
          durationDays: null as any,
        }),
      ).toThrow('[ExperienceDurationFormatter] Invalid package duration: days must be an integer >= 1. Received: null')
    })
  })

  describe('2. ExperienceRepository Duration Contract Mapping (Positive & Negative Invariants)', () => {
    const createMockPayload = (mockDoc: any) => ({
      findByID: vi.fn().mockResolvedValue(mockDoc),
      find: vi.fn().mockResolvedValue({ docs: mockDoc ? [mockDoc] : [] }),
    })

    it('POSITIVE: maps pure daily_tour with only durationMinutes (zero days/nights) successfully', async () => {
      const doc = {
        id: 101,
        title: 'Giza Pyramids Private Tour',
        slug: 'giza-pyramids-private-tour',
        type: 'daily_tour',
        city: { id: 1 },
        availability: 'available',
        duration: {
          durationMinutes: 420, // 7 hours
        },
        price: 1500,
        schedules: [{ startTime: '09:00', defaultCapacity: 20 }],
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      const aggregate = await repo.findById(101)

      expect(aggregate.type).toBe('daily_tour')
      if (aggregate.type === 'daily_tour') {
        expect(aggregate.durationMinutes).toBe(420)
        expect(aggregate.duration.durationMinutes).toBe(420)
        expect(aggregate.durationDays).toBeUndefined()
        expect(aggregate.durationNights).toBeUndefined()
      }
    })

    it('POSITIVE: maps pure package with days and nights (no durationMinutes) successfully', async () => {
      const doc = {
        id: 102,
        title: 'Nile Cruise Explorer',
        slug: 'nile-cruise-explorer',
        type: 'package',
        packageMode: 'fixed_date',
        city: { id: 2 },
        availability: 'available',
        duration: {
          days: 5,
          nights: 4,
        },
        price: 25000,
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      const aggregate = await repo.findById(102)

      expect(aggregate.type).toBe('package')
      if (aggregate.type === 'package') {
        expect(aggregate.durationDays).toBe(5)
        expect(aggregate.durationNights).toBe(4)
        expect(aggregate.duration.days).toBe(5)
        expect(aggregate.duration.nights).toBe(4)
        expect(aggregate.durationMinutes).toBeUndefined()
      }
    })

    it('NEGATIVE: rejects Daily Tour that has days/nights instead of durationMinutes', async () => {
      const doc = {
        id: 103,
        title: 'Corrupt Daily Tour (Has Days)',
        slug: 'corrupt-daily-tour-days',
        type: 'daily_tour',
        city: { id: 1 },
        availability: 'available',
        duration: { days: 1, nights: 0 },
        price: 1500,
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(103)).rejects.toThrow(
        '[ExperienceRepository] Daily Tour #103 is missing required duration.durationMinutes (must be >= 15 minutes).',
      )
    })

    it('BOUNDARY NORMALIZATION: cleanly strips legacy days/nights from Daily Tour to guarantee pure domain aggregate', async () => {
      const legacyDoc = {
        id: 104,
        title: 'Legacy Daily Tour With Days In DB',
        slug: 'legacy-daily-tour-days',
        type: 'daily_tour',
        city: { id: 1 },
        availability: 'available',
        duration: { durationMinutes: 240, days: 1, nights: 0 },
        price: 1500,
      }

      const repo = new ExperienceRepository(createMockPayload(legacyDoc) as any)
      const aggregate = await repo.findById(104)

      expect(aggregate.type).toBe('daily_tour')
      if (aggregate.type === 'daily_tour') {
        expect(aggregate.durationMinutes).toBe(240)
        expect(aggregate.duration.durationMinutes).toBe(240)
        expect(aggregate.durationDays).toBeUndefined()
        expect(aggregate.durationNights).toBeUndefined()
      }
    })

    it('NEGATIVE: rejects Package that has durationMinutes instead of days', async () => {
      const doc = {
        id: 105,
        title: 'Corrupt Package (Has Minutes)',
        slug: 'corrupt-package-minutes',
        type: 'package',
        city: { id: 1 },
        availability: 'available',
        duration: { durationMinutes: 420 },
        price: 10000,
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(105)).rejects.toThrow(
        '[ExperienceRepository] Database record for package #105 is missing required duration.days (must be >= 1).',
      )
    })

    it('BOUNDARY NORMALIZATION: cleanly strips legacy durationMinutes from Package to guarantee pure domain aggregate', async () => {
      const legacyDoc = {
        id: 106,
        title: 'Legacy Package With Minutes In DB',
        slug: 'legacy-package-minutes',
        type: 'package',
        city: { id: 1 },
        availability: 'available',
        duration: { days: 5, nights: 4, durationMinutes: 420 },
        price: 10000,
      }

      const repo = new ExperienceRepository(createMockPayload(legacyDoc) as any)
      const aggregate = await repo.findById(106)

      expect(aggregate.type).toBe('package')
      if (aggregate.type === 'package') {
        expect(aggregate.durationDays).toBe(5)
        expect(aggregate.durationNights).toBe(4)
        expect(aggregate.duration.days).toBe(5)
        expect(aggregate.duration.nights).toBe(4)
        expect(aggregate.durationMinutes).toBeUndefined()
      }
    })

    it('NEGATIVE: rejects Daily Tour with durationMinutes = 0 or < 15', async () => {
      const doc = {
        id: 107,
        title: 'Zero Minutes Tour',
        slug: 'zero-minutes-tour',
        type: 'daily_tour',
        city: { id: 1 },
        availability: 'available',
        duration: { durationMinutes: 0 },
        price: 1500,
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(107)).rejects.toThrow(
        '[ExperienceRepository] Daily Tour #107 is missing required duration.durationMinutes (must be >= 15 minutes).',
      )
    })

    it('NEGATIVE: rejects Package with duration.days = 0 or negative', async () => {
      const doc = {
        id: 108,
        title: 'Zero Days Package',
        slug: 'zero-days-package',
        type: 'package',
        city: { id: 1 },
        availability: 'available',
        duration: { days: 0 },
        price: 10000,
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(108)).rejects.toThrow(
        '[ExperienceRepository] Database record for package #108 is missing required duration.days (must be >= 1).',
      )
    })
  })

  describe('3. Admin UX Hours <-> Minutes Deterministic Conversions', () => {
    function convertHoursToStoredMinutes(hoursInput: number | string): number | null {
      const parsed = typeof hoursInput === 'number' ? hoursInput : Number(hoursInput)
      if (isNaN(parsed) || parsed <= 0) return null
      return Math.round(parsed * 60)
    }

    function convertStoredMinutesToDisplayHours(minutes: number | null | undefined): string {
      if (typeof minutes !== 'number' || isNaN(minutes) || minutes <= 0) return ''
      return String(minutes / 60)
    }

    it('converts standard integer hours to exact minutes for DB storage', () => {
      expect(convertHoursToStoredMinutes(3)).toBe(180)
      expect(convertHoursToStoredMinutes(1)).toBe(60)
      expect(convertHoursToStoredMinutes(7)).toBe(420)
    })

    it('converts fractional hours (half hours, quarter hours) deterministically', () => {
      expect(convertHoursToStoredMinutes(1.5)).toBe(90)
      expect(convertHoursToStoredMinutes(4.5)).toBe(270)
      expect(convertHoursToStoredMinutes(0.25)).toBe(15)
      expect(convertHoursToStoredMinutes(2.75)).toBe(165)
    })

    it('converts existing DB minutes to display hours accurately', () => {
      expect(convertStoredMinutesToDisplayHours(180)).toBe('3')
      expect(convertStoredMinutesToDisplayHours(90)).toBe('1.5')
      expect(convertStoredMinutesToDisplayHours(270)).toBe('4.5')
      expect(convertStoredMinutesToDisplayHours(420)).toBe('7')
      expect(convertStoredMinutesToDisplayHours(15)).toBe('0.25')
    })

    it('handles null, undefined, or invalid inputs safely without fallbacks', () => {
      expect(convertHoursToStoredMinutes('')).toBeNull()
      expect(convertHoursToStoredMinutes('abc')).toBeNull()
      expect(convertHoursToStoredMinutes(-1)).toBeNull()
      expect(convertStoredMinutesToDisplayHours(undefined)).toBe('')
      expect(convertStoredMinutesToDisplayHours(null)).toBe('')
      expect(convertStoredMinutesToDisplayHours(0)).toBe('')
    })
  })
})

