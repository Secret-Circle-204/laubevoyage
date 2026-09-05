import type { ExperienceDuration } from './types'

export type FormattableDurationInput =
  | ExperienceDuration
  | { type: 'package'; duration: { days: number; nights?: number } }
  | { type: 'daily_tour'; duration: { durationMinutes: number } }
  | { type: 'package'; durationDays: number; durationNights?: number }
  | { type: 'daily_tour'; durationMinutes: number }

export interface DurationLabels {
  daySingular?: string
  dayPlural?: string
  nightSingular?: string
  nightPlural?: string
  hourSingular?: string
  hourPlural?: string
  minSingular?: string
  minPlural?: string
}

/**
 * Canonical Experience Duration Formatter (Fail-Fast, Zero Silent Fallbacks)
 * Converts authoritative domain duration representations into human-friendly strings.
 *
 * Daily Tours (durationMinutes >= 15):
 *   - 60 mins  -> "1 Hour"
 *   - 420 mins -> "7 Hours"
 *   - 90 mins  -> "1h 30m"
 *   - 45 mins  -> "45 Mins"
 *
 * Packages (days >= 1, optional nights >= 0):
 *   - 5 days, 4 nights -> "5 Days / 4 Nights"
 *   - 3 days, 0 nights -> "3 Days"
 *   - 1 day            -> "1 Day"
 *
 * @throws Error if the duration data violates domain invariants.
 */
export function formatExperienceDuration(
  input: FormattableDurationInput,
  labels?: DurationLabels,
): string {
  if (!input || typeof input !== 'object') {
    throw new Error('[ExperienceDurationFormatter] Duration input must be a valid object.')
  }

  const daySingular = labels?.daySingular || 'Day'
  const dayPlural = labels?.dayPlural || 'Days'
  const nightSingular = labels?.nightSingular || 'Night'
  const nightPlural = labels?.nightPlural || 'Nights'
  const hourSingular = labels?.hourSingular || 'Hour'
  const hourPlural = labels?.hourPlural || 'Hours'
  const minPlural = labels?.minPlural || 'Mins'

  if (input.type === 'daily_tour') {
    let mins: unknown
    if ('duration' in input && input.duration && typeof input.duration === 'object') {
      mins = input.duration.durationMinutes
    } else if ('durationMinutes' in input) {
      mins = input.durationMinutes
    }

    if (typeof mins !== 'number' || isNaN(mins) || !Number.isInteger(mins) || mins < 15) {
      throw new Error(
        `[ExperienceDurationFormatter] Invalid daily_tour duration: durationMinutes must be an integer >= 15. Received: ${mins}`,
      )
    }

    if (mins % 60 === 0) {
      const hours = mins / 60
      return hours === 1 ? `1 ${hourSingular}` : `${hours} ${hourPlural}`
    }

    const hours = Math.floor(mins / 60)
    const remainingMinutes = mins % 60

    if (hours === 0) {
      return `${remainingMinutes} ${minPlural}`
    }

    return `${hours}h ${remainingMinutes}m`
  }

  if (input.type === 'package') {
    let days: unknown
    let nights: unknown

    if ('duration' in input && input.duration && typeof input.duration === 'object') {
      days = input.duration.days
      nights = input.duration.nights
    } else {
      if ('days' in input) days = input.days
      else if ('durationDays' in input) days = input.durationDays

      if ('nights' in input) nights = input.nights
      else if ('durationNights' in input) nights = input.durationNights
    }

    if (typeof days !== 'number' || isNaN(days) || !Number.isInteger(days) || days < 1) {
      throw new Error(
        `[ExperienceDurationFormatter] Invalid package duration: days must be an integer >= 1. Received: ${days}`,
      )
    }

    const dayStr = days === 1 ? `1 ${daySingular}` : `${days} ${dayPlural}`

    if (nights !== undefined && nights !== null) {
      if (typeof nights !== 'number' || isNaN(nights) || !Number.isInteger(nights) || nights < 0) {
        throw new Error(
          `[ExperienceDurationFormatter] Invalid package duration: nights must be an integer >= 0. Received: ${nights}`,
        )
      }

      if (nights > 0) {
        const nightStr = nights === 1 ? `1 ${nightSingular}` : `${nights} ${nightPlural}`
        return `${dayStr} / ${nightStr}`
      }
    }

    return dayStr
  }

  throw new Error(
    `[ExperienceDurationFormatter] Unknown experience type: ${(input as any).type}. Expected 'package' or 'daily_tour'.`,
  )
}
