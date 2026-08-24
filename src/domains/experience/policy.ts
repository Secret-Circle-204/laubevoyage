import type { ExperienceAggregate } from './aggregate'
import type { AvailabilityPolicyResult, ExperienceType, ScheduleConfig } from './types'
import { convertZonedLocalToUtc, resolveTripCompletionInstant } from '@/domains/booking/trip-completion-resolver'
import { BlackoutPolicy } from './blackout-policy'
import { getBusinessDateString, addDaysToDateString } from '@/lib/date'

export interface DepartureBookabilityParams {
  type: ExperienceType
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm
  durationMinutes?: number
  endDate?: string // YYYY-MM-DD (for package)
  timezone: string // IANA string e.g. 'Africa/Cairo'
}

export type BlackoutItem = { date: string; startTime?: string; reason?: string }

/**
 * Pure Experience Policy
 * Single source of truth for pure business validation rules in the Experience Domain.
 */
export class ExperiencePolicy {
  /**
   * Validate if an experience is active and published for booking.
   */
  static canBookExperience(experience: ExperienceAggregate): AvailabilityPolicyResult {
    if (!experience.isActive) {
      return {
        allowed: false,
        code: 'EXPERIENCE_INACTIVE',
        reason: `Experience '${experience.title}' is currently inactive.`,
      }
    }

    if (experience.availability !== 'available') {
      return {
        allowed: false,
        code: 'EXPERIENCE_UNAVAILABLE',
        reason: `Experience '${experience.title}' availability status is '${experience.availability}'.`,
      }
    }

    return { allowed: true }
  }

  /**
   * 1. Fixed Package Slot Bookability Policy
   * Evaluates physical departure slots against DB status, remaining capacity, and temporal cutoff.
   */
  static isFixedPackageSlotBookable(
    params: {
      date: string
      startTime?: string
      slotStatus: string
      capacityAvailable: number
      timezone: string
    },
    now: Date = new Date(),
  ): AvailabilityPolicyResult {
    const { date, startTime, slotStatus, capacityAvailable, timezone } = params

    if (!date) {
      return { allowed: false, code: 'INVALID_DEPARTURE_DATE', reason: 'Slot date is required.' }
    }
    if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
      return { allowed: false, code: 'MISSING_TIMEZONE', reason: 'Authoritative timezone is required.' }
    }
    if (slotStatus !== 'available') {
      return { allowed: false, code: 'SLOT_UNAVAILABLE', reason: `Slot status is '${slotStatus}'.` }
    }
    if (capacityAvailable <= 0) {
      return { allowed: false, code: 'SLOT_SOLD_OUT', reason: 'No seats available for this departure slot.' }
    }

    const nowTime = now.getTime()
    if (startTime) {
      const startInstantUtc = convertZonedLocalToUtc(date, startTime, timezone)
      if (startInstantUtc.getTime() <= nowTime) {
        return {
          allowed: false,
          code: 'DEPARTURE_IN_PAST',
          reason: `Departure slot on ${date} at ${startTime} has already started or passed.`,
        }
      }
    } else {
      // Date-level slot check: cannot start in past calendar day in destination timezone
      const todayInTimezone = getBusinessDateString(timezone, now)
      if (date < todayInTimezone) {
        return {
          allowed: false,
          code: 'DEPARTURE_IN_PAST',
          reason: `Departure slot date ${date} is in the past.`,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * 2. Daily Tour Departure Bookability Policy
   * Evaluates recurring daily schedules against exact duration, current instant, and blackouts.
   */
  static isDailyTourDepartureBookable(
    params: {
      date: string
      startTime: string
      durationMinutes: number
      blackouts: BlackoutItem[]
      timezone: string
    },
    now: Date = new Date(),
  ): AvailabilityPolicyResult {
    const { date, startTime, durationMinutes, blackouts, timezone } = params

    if (!date) {
      return { allowed: false, code: 'INVALID_DEPARTURE_DATE', reason: 'Departure date is required.' }
    }
    if (!startTime) {
      return { allowed: false, code: 'MISSING_START_TIME', reason: 'Daily Tour requires a departure startTime.' }
    }
    if (!durationMinutes || durationMinutes < 15) {
      return {
        allowed: false,
        code: 'INVALID_DURATION',
        reason: `Daily Tour requires valid durationMinutes >= 15. Received: ${durationMinutes}`,
      }
    }
    if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
      return { allowed: false, code: 'MISSING_TIMEZONE', reason: 'Authoritative timezone is required.' }
    }

    // Blackout check
    const blackoutCheck = BlackoutPolicy.isDateBlackedOut(date, startTime, blackouts)
    if (!blackoutCheck.allowed) {
      return blackoutCheck
    }

    const nowTime = now.getTime()
    const startInstantUtc = convertZonedLocalToUtc(date, startTime, timezone)
    const endInstantUtc = resolveTripCompletionInstant({
      type: 'daily_tour',
      startDate: date,
      endDate: date,
      startTime,
      durationMinutes,
      timezone,
    })

    if (endInstantUtc.getTime() <= nowTime) {
      return {
        allowed: false,
        code: 'DEPARTURE_COMPLETED',
        reason: `Departure on ${date} at ${startTime} has already completed.`,
      }
    }

    if (startInstantUtc.getTime() <= nowTime) {
      return {
        allowed: false,
        code: 'DEPARTURE_IN_PAST',
        reason: `Departure on ${date} at ${startTime} has already started or passed.`,
      }
    }

    return { allowed: true }
  }

  /**
   * 3. Flexible Package Start Date Bookability Policy
   * Evaluates user-selected start date against calendar cutoff, trip completion, and blackouts.
   * ZERO physical departure slots required.
   */
  static isFlexiblePackageStartDateBookable(
    params: {
      startDate: string
      durationDays: number
      blackouts: BlackoutItem[]
      timezone: string
    },
    now: Date = new Date(),
  ): AvailabilityPolicyResult {
    const { startDate, durationDays, blackouts, timezone } = params

    if (!startDate) {
      return { allowed: false, code: 'INVALID_DEPARTURE_DATE', reason: 'Start date is required.' }
    }
    if (!durationDays || durationDays < 1) {
      return {
        allowed: false,
        code: 'INVALID_DURATION',
        reason: `Flexible Package requires durationDays >= 1. Received: ${durationDays}`,
      }
    }
    if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
      return { allowed: false, code: 'MISSING_TIMEZONE', reason: 'Authoritative timezone is required.' }
    }

    const todayInTimezone = getBusinessDateString(timezone, now)
    if (startDate < todayInTimezone) {
      return {
        allowed: false,
        code: 'DEPARTURE_IN_PAST',
        reason: `Start date ${startDate} is in the past (Current local date: ${todayInTimezone}).`,
      }
    }

    // Blackout check for the start date
    const blackoutCheck = BlackoutPolicy.isDateBlackedOut(startDate, undefined, blackouts)
    if (!blackoutCheck.allowed) {
      return blackoutCheck
    }

    const endDate = addDaysToDateString(startDate, durationDays - 1)
    const endInstantUtc = resolveTripCompletionInstant({
      type: 'package',
      startDate,
      endDate,
      timezone,
    })

    if (endInstantUtc.getTime() <= now.getTime()) {
      return {
        allowed: false,
        code: 'DEPARTURE_COMPLETED',
        reason: `Flexible package starting on ${startDate} has already completed.`,
      }
    }

    return { allowed: true }
  }

  /**
   * Deterministically finds the first bookable daily tour departure starting from today in destination timezone.
   * Searches up to 60 days ahead.
   */
  static findFirstBookableDailyTourDeparture(
    params: {
      schedules: ScheduleConfig[]
      durationMinutes: number
      blackouts: BlackoutItem[]
      timezone: string
    },
    now: Date = new Date(),
  ): { date: string; startTime: string } | null {
    const { schedules, durationMinutes, blackouts, timezone } = params
    if (!schedules || schedules.length === 0) return null

    const todayInTimezone = getBusinessDateString(timezone, now)
    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const candidateDate = addDaysToDateString(todayInTimezone, dayOffset)
      for (const schedule of schedules) {
        const check = this.isDailyTourDepartureBookable(
          {
            date: candidateDate,
            startTime: schedule.startTime,
            durationMinutes,
            blackouts,
            timezone,
          },
          now,
        )
        if (check.allowed) {
          return { date: candidateDate, startTime: schedule.startTime }
        }
      }
    }
    return null
  }

  /**
   * Deterministically finds the first bookable start date for a flexible package starting from today.
   * Searches up to 365 days ahead.
   */
  static findFirstBookableFlexibleStartDate(
    params: {
      durationDays: number
      blackouts: BlackoutItem[]
      timezone: string
    },
    now: Date = new Date(),
  ): string | null {
    const { durationDays, blackouts, timezone } = params
    const todayInTimezone = getBusinessDateString(timezone, now)

    for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
      const candidateDate = addDaysToDateString(todayInTimezone, dayOffset)
      const check = this.isFlexiblePackageStartDateBookable(
        {
          startDate: candidateDate,
          durationDays,
          blackouts,
          timezone,
        },
        now,
      )
      if (check.allowed) {
        return candidateDate
      }
    }
    return null
  }

  /**
   * Operational Bookability Policy Router
   */
  static isDepartureBookable(
    params: DepartureBookabilityParams,
    now: Date = new Date(),
  ): AvailabilityPolicyResult {
    const { type, date, startTime, durationMinutes, endDate, timezone } = params

    if (!date) {
      return { allowed: false, code: 'INVALID_DEPARTURE_DATE', reason: 'Departure date is required.' }
    }
    if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
      return { allowed: false, code: 'MISSING_TIMEZONE', reason: 'Authoritative timezone is required.' }
    }

    try {
      if (type === 'daily_tour') {
        if (!startTime) {
          return { allowed: false, code: 'MISSING_START_TIME', reason: 'Daily Tour requires a departure startTime.' }
        }
        return this.isDailyTourDepartureBookable(
          {
            date,
            startTime,
            durationMinutes: durationMinutes || 0,
            blackouts: [],
            timezone,
          },
          now,
        )
      }

      if (type === 'package') {
        if (startTime) {
          return this.isFixedPackageSlotBookable(
            {
              date,
              startTime,
              slotStatus: 'available',
              capacityAvailable: 1,
              timezone,
            },
            now,
          )
        }

        const effectiveDurationDays = endDate
          ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)) + 1)
          : 1

        return this.isFlexiblePackageStartDateBookable(
          {
            startDate: date,
            durationDays: effectiveDurationDays,
            blackouts: [],
            timezone,
          },
          now,
        )
      }

      return {
        allowed: false,
        code: 'INVALID_EXPERIENCE_TYPE',
        reason: `Unsupported experience type: ${type}`,
      }
    } catch (err: unknown) {
      return {
        allowed: false,
        code: 'BOOKABILITY_EVALUATION_ERROR',
        reason: err instanceof Error ? err.message : 'Failed to evaluate departure bookability.',
      }
    }
  }
}

