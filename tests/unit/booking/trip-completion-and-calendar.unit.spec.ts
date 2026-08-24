import { describe, it, expect } from 'vitest'
import { resolveTripCompletionInstant } from '@/domains/booking/trip-completion-resolver'
import { addDaysToDateString } from '@/lib/date'

describe('Domain Temporal Invariants: Calendar Scope vs Frozen Operational Completion', () => {
  it('Daily Tour (10:00 AM, 120 min, Africa/Cairo): proves calendarEndDate = 2026-08-25 and completionAt = 09:00:00 UTC (12:00 PM Cairo)', () => {
    const startDate = '2026-08-25'
    const startTime = '10:00'
    const durationMinutes = 120
    const timezone = 'Africa/Cairo'

    // Calendar scope invariant for daily tour
    const calendarEndDate = startDate
    expect(calendarEndDate).toBe('2026-08-25')

    // Operational completion instant
    const completionInstant = resolveTripCompletionInstant({
      type: 'daily_tour',
      startDate,
      endDate: calendarEndDate,
      startTime,
      durationMinutes,
      timezone,
    })

    // 10:00 AM + 2 hours = 12:00 PM Cairo (UTC+3) -> 09:00:00 UTC
    expect(completionInstant.toISOString()).toBe('2026-08-25T09:00:00.000Z')
  })

  it('Daily Tour Cross-Midnight (23:00, 120 min, Africa/Cairo): proves completionAt is next calendar day in Cairo (01:00 AM Cairo = 22:00 UTC)', () => {
    const startDate = '2026-08-25'
    const startTime = '23:00'
    const durationMinutes = 120
    const timezone = 'Africa/Cairo'

    const calendarEndDate = startDate

    const completionInstant = resolveTripCompletionInstant({
      type: 'daily_tour',
      startDate,
      endDate: calendarEndDate,
      startTime,
      durationMinutes,
      timezone,
    })

    // 23:00 Cairo + 2h = 01:00 AM on Aug 26 Cairo (UTC+3) -> 22:00:00 UTC on Aug 25
    expect(completionInstant.toISOString()).toBe('2026-08-25T22:00:00.000Z')
  })

  it('Multi-Day Package (4 days starting 2026-10-15): proves calendarEndDate = 2026-10-18 and completionAt = 12:00:00 Cairo on final day', () => {
    const startDate = '2026-10-15'
    const durationDays = 4
    const timezone = 'Africa/Cairo'

    // Pure calendar arithmetic
    const calendarEndDate = addDaysToDateString(startDate, durationDays - 1)
    expect(calendarEndDate).toBe('2026-10-18')

    const completionInstant = resolveTripCompletionInstant({
      type: 'package',
      startDate,
      endDate: calendarEndDate,
      timezone,
    })

    // 12:00:00 Cairo (UTC+3) on 2026-10-18 -> 09:00:00 UTC on 2026-10-18
    expect(completionInstant.toISOString()).toBe('2026-10-18T09:00:00.000Z')
  })
})
