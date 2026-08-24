import { describe, it, expect } from 'vitest'
import {
  resolveTripCompletionInstant,
  convertZonedLocalToUtc,
} from '@/domains/booking/trip-completion-resolver'

describe('TripCompletionResolver (Pure Domain Function)', () => {
  describe('Zoned-to-UTC Converter (convertZonedLocalToUtc)', () => {
    it('accurately converts Cairo local time (Africa/Cairo in summer: UTC+3)', () => {
      // 2026-09-04 12:00:00 Cairo Time -> 2026-09-04T09:00:00.000Z
      const utcDate = convertZonedLocalToUtc('2026-09-04', '12:00:00', 'Africa/Cairo')
      expect(utcDate.toISOString()).toBe('2026-09-04T09:00:00.000Z')
    })

    it('accurately converts Shanghai local time (Asia/Shanghai: UTC+8)', () => {
      // 2026-09-04 12:00:00 Shanghai Time -> 2026-09-04T04:00:00.000Z
      const utcDate = convertZonedLocalToUtc('2026-09-04', '12:00:00', 'Asia/Shanghai')
      expect(utcDate.toISOString()).toBe('2026-09-04T04:00:00.000Z')
    })

    it('accurately converts Berlin local time (Europe/Berlin in summer CEST: UTC+2)', () => {
      // 2026-09-04 12:00:00 Berlin Time -> 2026-09-04T10:00:00.000Z
      const utcDate = convertZonedLocalToUtc('2026-09-04', '12:00:00', 'Europe/Berlin')
      expect(utcDate.toISOString()).toBe('2026-09-04T10:00:00.000Z')
    })

    it('accurately converts New York summer time (EDT: UTC-4)', () => {
      // 2026-07-15 12:00:00 New York Summer -> 2026-07-15T16:00:00.000Z
      const utcDate = convertZonedLocalToUtc('2026-07-15', '12:00:00', 'America/New_York')
      expect(utcDate.toISOString()).toBe('2026-07-15T16:00:00.000Z')
    })

    it('accurately converts New York winter time (EST: UTC-5)', () => {
      // 2026-01-15 12:00:00 New York Winter -> 2026-01-15T17:00:00.000Z
      const utcDate = convertZonedLocalToUtc('2026-01-15', '12:00:00', 'America/New_York')
      expect(utcDate.toISOString()).toBe('2026-01-15T17:00:00.000Z')
    })

    it('accurately converts fractional timezone offsets (Kathmandu: UTC+5:45)', () => {
      // 2026-09-04 12:00:00 Kathmandu -> 2026-09-04T06:15:00.000Z
      const utcDate = convertZonedLocalToUtc('2026-09-04', '12:00:00', 'Asia/Kathmandu')
      expect(utcDate.toISOString()).toBe('2026-09-04T06:15:00.000Z')
    })

    it('accurately converts fractional timezone offsets (Kolkata: UTC+5:30)', () => {
      // 2026-09-04 12:00:00 Kolkata -> 2026-09-04T06:30:00.000Z
      const utcDate = convertZonedLocalToUtc('2026-09-04', '12:00:00', 'Asia/Kolkata')
      expect(utcDate.toISOString()).toBe('2026-09-04T06:30:00.000Z')
    })

    it('accurately handles DST spring-forward transition boundary in America/New_York', () => {
      // On 2026-03-08, clocks in NY jump from 02:00:00 to 03:00:00 (EDT UTC-4)
      // At 03:30 local time (first valid hour post-gap): 03:30 EDT = 07:30 UTC
      const postGapUtc = convertZonedLocalToUtc('2026-03-08', '03:30:00', 'America/New_York')
      expect(postGapUtc.toISOString()).toBe('2026-03-08T07:30:00.000Z')
    })

    it('accurately handles DST fall-back transition boundary in America/New_York', () => {
      // On 2026-11-01, clocks in NY fall back from 02:00:00 back to 01:00:00 (EST UTC-5)
      // At 12:00 local time (clearly after transition): 12:00 EST = 17:00 UTC
      const postOverlapUtc = convertZonedLocalToUtc('2026-11-01', '12:00:00', 'America/New_York')
      expect(postOverlapUtc.toISOString()).toBe('2026-11-01T17:00:00.000Z')
    })

    it('throws fail-fast error for invalid IANA timezone', () => {
      expect(() => {
        convertZonedLocalToUtc('2026-09-04', '12:00:00', 'Invalid/Fake_Timezone')
      }).toThrowError(/Unsupported or invalid IANA timeZone/)
    })

    it('throws fail-fast error for nonexistent calendar dates (e.g. Feb 31, Apr 31)', () => {
      expect(() => {
        convertZonedLocalToUtc('2026-02-31', '12:00:00', 'Africa/Cairo')
      }).toThrowError(/Nonexistent calendar date/)

      expect(() => {
        convertZonedLocalToUtc('2026-04-31', '12:00:00', 'Africa/Cairo')
      }).toThrowError(/Nonexistent calendar date/)

      expect(() => {
        convertZonedLocalToUtc('2026-11-31', '12:00:00', 'Africa/Cairo')
      }).toThrowError(/Nonexistent calendar date/)
    })

    it('throws fail-fast error for invalid time components (e.g. 25:00, 12:60)', () => {
      expect(() => {
        convertZonedLocalToUtc('2026-09-04', '25:00:00', 'Africa/Cairo')
      }).toThrowError(/Invalid timeStr format/)

      expect(() => {
        convertZonedLocalToUtc('2026-09-04', '12:60:00', 'Africa/Cairo')
      }).toThrowError(/Invalid timeStr format/)
    })
  })

  describe('Package Completion Instant', () => {
    it('resolves Package completion at 12:00 local time on endDate for Cairo', () => {
      const instant = resolveTripCompletionInstant({
        type: 'package',
        startDate: '2026-09-01',
        endDate: '2026-09-04',
        timezone: 'Africa/Cairo',
      })
      // 2026-09-04 12:00:00 Cairo (UTC+3) -> 2026-09-04T09:00:00.000Z
      expect(instant.toISOString()).toBe('2026-09-04T09:00:00.000Z')
    })

    it('resolves Package completion at 12:00 local time on endDate for Shanghai', () => {
      const instant = resolveTripCompletionInstant({
        type: 'package',
        startDate: '2026-09-01',
        endDate: '2026-09-04',
        timezone: 'Asia/Shanghai',
      })
      // 2026-09-04 12:00:00 Shanghai (UTC+8) -> 2026-09-04T04:00:00.000Z
      expect(instant.toISOString()).toBe('2026-09-04T04:00:00.000Z')
    })

    it('throws fail-fast error if Package has missing endDate', () => {
      expect(() => {
        resolveTripCompletionInstant({
          type: 'package',
          startDate: '2026-09-01',
          endDate: '',
          timezone: 'Africa/Cairo',
        })
      }).toThrowError(/Package requires a valid endDate/)
    })

    it('throws fail-fast error if Package has nonexistent endDate (e.g. Feb 31)', () => {
      expect(() => {
        resolveTripCompletionInstant({
          type: 'package',
          startDate: '2026-02-01',
          endDate: '2026-02-31',
          timezone: 'Africa/Cairo',
        })
      }).toThrowError(/Nonexistent calendar date/)
    })
  })

  describe('Daily Tour Completion Instant & Edge Cases', () => {
    it('Scenario 1 (Standard): 09:00 + 240 mins (4 hours) = 13:00 Cairo Time', () => {
      const instant = resolveTripCompletionInstant({
        type: 'daily_tour',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
        startTime: '09:00',
        durationMinutes: 240,
        timezone: 'Africa/Cairo',
      })
      // 2026-09-01 13:00:00 Cairo (UTC+3) -> 2026-09-01T10:00:00.000Z
      expect(instant.toISOString()).toBe('2026-09-01T10:00:00.000Z')
    })

    it('Scenario 2 (Cross-Midnight): 20:00 + 300 mins (5 hours) = 01:00 Next Day', () => {
      const instant = resolveTripCompletionInstant({
        type: 'daily_tour',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
        startTime: '20:00',
        durationMinutes: 300,
        timezone: 'Africa/Cairo',
      })
      // 2026-09-01 20:00 + 5h = 2026-09-02 01:00:00 Cairo (UTC+3) -> 2026-09-01T22:00:00.000Z
      expect(instant.toISOString()).toBe('2026-09-01T22:00:00.000Z')
    })

    it('Scenario 3 (Late Night Cross-Midnight): 23:00 + 180 mins (3 hours) = 02:00 Next Day', () => {
      const instant = resolveTripCompletionInstant({
        type: 'daily_tour',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
        startTime: '23:00',
        durationMinutes: 180,
        timezone: 'Africa/Cairo',
      })
      // 2026-09-01 23:00 + 3h = 2026-09-02 02:00:00 Cairo (UTC+3) -> 2026-09-01T23:00:00.000Z
      expect(instant.toISOString()).toBe('2026-09-01T23:00:00.000Z')
    })

    it('Scenario 4 (Midnight Edge): 23:30 + 90 mins (1.5 hours) = 01:00 Next Day in Berlin', () => {
      const instant = resolveTripCompletionInstant({
        type: 'daily_tour',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
        startTime: '23:30',
        durationMinutes: 90,
        timezone: 'Europe/Berlin',
      })
      // 2026-09-01 23:30 + 1.5h = 2026-09-02 01:00:00 Berlin (UTC+2) -> 2026-09-01T23:00:00.000Z
      expect(instant.toISOString()).toBe('2026-09-01T23:00:00.000Z')
    })

    it('Scenario 5 (New York Evening Tour): 18:00 + 240 mins = 22:00 in America/New_York (EDT UTC-4)', () => {
      const instant = resolveTripCompletionInstant({
        type: 'daily_tour',
        startDate: '2026-07-15',
        endDate: '2026-07-15',
        startTime: '18:00',
        durationMinutes: 240,
        timezone: 'America/New_York',
      })
      // 2026-07-15 22:00:00 NY EDT (UTC-4) -> 2026-07-16T02:00:00.000Z
      expect(instant.toISOString()).toBe('2026-07-16T02:00:00.000Z')
    })

    it('Scenario 6 (Fail-Fast Policy): Throws error if Daily Tour has no durationMinutes', () => {
      expect(() => {
        resolveTripCompletionInstant({
          type: 'daily_tour',
          startDate: '2026-09-01',
          endDate: '2026-09-01',
          startTime: '09:00',
          durationMinutes: undefined,
          timezone: 'Africa/Cairo',
        })
      }).toThrowError(/Daily Tour requires an integer durationMinutes >= 15/)
    })

    it('Scenario 7 (Fail-Fast Policy): Throws error if Daily Tour has durationMinutes < 15', () => {
      expect(() => {
        resolveTripCompletionInstant({
          type: 'daily_tour',
          startDate: '2026-09-01',
          endDate: '2026-09-01',
          startTime: '09:00',
          durationMinutes: 10,
          timezone: 'Africa/Cairo',
        })
      }).toThrowError(/Daily Tour requires an integer durationMinutes >= 15/)
    })

    it('Scenario 8 (Decimal Duration Rejection): Throws error if durationMinutes is decimal (e.g. 90.5)', () => {
      expect(() => {
        resolveTripCompletionInstant({
          type: 'daily_tour',
          startDate: '2026-09-01',
          endDate: '2026-09-01',
          startTime: '09:00',
          durationMinutes: 90.5,
          timezone: 'Africa/Cairo',
        })
      }).toThrowError(/Daily Tour requires an integer durationMinutes >= 15/)
    })

    it('Scenario 9 (Strict HH:mm Time Format): Throws error if startTime contains seconds (e.g. 09:00:30)', () => {
      expect(() => {
        resolveTripCompletionInstant({
          type: 'daily_tour',
          startDate: '2026-09-01',
          endDate: '2026-09-01',
          startTime: '09:00:30',
          durationMinutes: 120,
          timezone: 'Africa/Cairo',
        })
      }).toThrowError(/Daily Tour requires a valid startTime in HH:mm format/)
    })

    it('Scenario 10 (Nonexistent startDate Rejection): Throws error if startDate is invalid calendar date', () => {
      expect(() => {
        resolveTripCompletionInstant({
          type: 'daily_tour',
          startDate: '2026-02-30',
          endDate: '2026-02-30',
          startTime: '09:00',
          durationMinutes: 120,
          timezone: 'Africa/Cairo',
        })
      }).toThrowError(/Nonexistent calendar date/)
    })

    it('Scenario 11 (Missing Timezone Rejection): Throws error if timezone is empty string', () => {
      expect(() => {
        resolveTripCompletionInstant({
          type: 'daily_tour',
          startDate: '2026-09-01',
          endDate: '2026-09-01',
          startTime: '09:00',
          durationMinutes: 120,
          timezone: '',
        })
      }).toThrowError(/Missing required authoritative IANA timezone/)
    })
  })
})
