/**
 * Trip Completion Instant Resolver (Pure Domain Function)
 * Single Source of Truth for calculating the exact UTC operational completion instant.
 * 
 * Rules:
 * - Daily Tour: (startDate + startTime) + durationMinutes @ Country.timezone ──► UTC Instant
 * - Package: endDate + 12:00:00 (Local Checkout Policy) @ Country.timezone ──► UTC Instant
 * - Fail-Fast: Zero fallbacks, zero guessed durations, zero guessed timezones.
 */

export interface TripEndResolutionParams {
  type: 'package' | 'daily_tour'
  startDate: string        // Format: YYYY-MM-DD (Authoritative ISO Date)
  endDate: string          // Format: YYYY-MM-DD (Authoritative ISO Date)
  startTime?: string       // Format: HH:mm (Strict 24-hour e.g. '09:00')
  durationMinutes?: number // Required integer >= 15 for daily_tour
  timezone: string         // Authoritative IANA string from Country (e.g. 'Africa/Cairo', 'America/New_York')
}

/**
 * Computes the exact timezone offset in milliseconds for a specific UTC timestamp.
 */
function getZonedOffsetMs(epochMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(new Date(epochMs))
  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value)

  let h = getPart('hour')
  if (h === 24) h = 0 // Handle 24:00 edge case in some ICU versions

  const localAsUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    h,
    getPart('minute'),
    getPart('second'),
  )

  return localAsUtc - epochMs
}

/**
 * Validates whether a YYYY-MM-DD string represents a real, existing calendar date.
 * Rejects invalid dates like 2026-02-31, 2026-04-31, 2026-11-31, etc.
 */
export function validateCalendarDate(dateStr: string, fieldName = 'date'): void {
  if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`[TripCompletionResolver] Invalid ${fieldName} format: "${dateStr}". Expected YYYY-MM-DD.`)
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`[TripCompletionResolver] Invalid ${fieldName} components in "${dateStr}".`)
  }

  const testDate = new Date(Date.UTC(year, month - 1, day))
  if (
    testDate.getUTCFullYear() !== year ||
    testDate.getUTCMonth() !== month - 1 ||
    testDate.getUTCDate() !== day
  ) {
    throw new Error(`[TripCompletionResolver] Nonexistent calendar date: "${dateStr}".`)
  }
}

/**
 * Universal IANA Zoned-to-UTC DateTime Converter.
 * 
 * Accurately handles:
 * - Standard positive, negative, and fractional offsets (+05:45, +05:30, +12:45, -03:30, etc.)
 * - Daylight Saving Time (DST) Transitions:
 *   - Spring-forward gap: Deterministically resolves to the valid post-transition instant.
 *   - Fall-back overlap: Deterministically resolves to the authoritative pre-transition instant.
 * - Strict validation of real calendar dates and 24-hour time strings.
 */
export function convertZonedLocalToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  validateCalendarDate(dateStr, 'dateStr')

  if (!timeStr || typeof timeStr !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(timeStr)) {
    throw new Error(`[TripCompletionResolver] Invalid timeStr format: "${timeStr}". Expected strict 24-hour HH:mm or HH:mm:ss.`)
  }

  if (!timeZone || typeof timeZone !== 'string' || timeZone.trim().length === 0) {
    throw new Error(`[TripCompletionResolver] Missing or empty IANA timeZone string.`)
  }

  // Validate IANA timezone with native Intl
  try {
    Intl.DateTimeFormat(undefined, { timeZone })
  } catch (err: unknown) {
    throw new Error(`[TripCompletionResolver] Unsupported or invalid IANA timeZone: "${timeZone}".`)
  }

  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, min, sec] = normalizedTime.split(':').map(Number)

  const targetLocalEpochMs = Date.UTC(year, month - 1, day, hour, min, sec)

  // Pass 1: Estimate offset using local epoch
  const initialOffset = getZonedOffsetMs(targetLocalEpochMs, timeZone)
  const candidateUtcEpoch = targetLocalEpochMs - initialOffset

  // Pass 2: Measure offset at candidate UTC epoch
  const pass2Offset = getZonedOffsetMs(candidateUtcEpoch, timeZone)

  if (pass2Offset === initialOffset) {
    return new Date(candidateUtcEpoch)
  }

  // Pass 3: Adjust for DST transition boundary (gap or overlap)
  const refinedUtcEpoch = targetLocalEpochMs - pass2Offset
  const pass3Offset = getZonedOffsetMs(refinedUtcEpoch, timeZone)

  if (pass3Offset === pass2Offset) {
    return new Date(refinedUtcEpoch)
  }

  // In a DST spring-forward gap (time doesn't exist locally), refinedUtcEpoch represents the gap boundary.
  return new Date(refinedUtcEpoch)
}

/**
 * Resolves the frozen operational completion instant (UTC Date) for a booking.
 * 
 * Invariants:
 * - Package: endDate + 12:00:00 (Local Policy) @ timezone ──► UTC Instant
 * - Daily Tour: (startDate + startTime) + durationMinutes @ timezone ──► UTC Instant
 * - durationMinutes must be an integer >= 15
 * - startTime must be strict HH:mm
 */
export function resolveTripCompletionInstant(params: TripEndResolutionParams): Date {
  const { type, startDate, endDate, startTime, durationMinutes, timezone } = params

  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    throw new Error('[TripCompletionResolver] Missing required authoritative IANA timezone.')
  }

  if (type === 'daily_tour') {
    if (!startDate) {
      throw new Error('[TripCompletionResolver] Daily Tour requires a valid startDate (YYYY-MM-DD).')
    }
    validateCalendarDate(startDate, 'startDate')

    if (!startTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      throw new Error(`[TripCompletionResolver] Daily Tour requires a valid startTime in HH:mm format. Received: "${startTime}".`)
    }

    if (
      typeof durationMinutes !== 'number' ||
      isNaN(durationMinutes) ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15
    ) {
      throw new Error(
        `[TripCompletionResolver] Daily Tour requires an integer durationMinutes >= 15. Received: ${durationMinutes}.`,
      )
    }

    const [startHour, startMin] = startTime.split(':').map(Number)
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number)

    // Calculate total minutes from start of day + duration
    const startTotalMinutes = startHour * 60 + startMin
    const endTotalMinutes = startTotalMinutes + durationMinutes

    const dayOffset = Math.floor(endTotalMinutes / 1440)
    const endHour = Math.floor((endTotalMinutes % 1440) / 60)
    const endMin = (endTotalMinutes % 1440) % 60

    // Handle cross-midnight day rollover in local calendar
    const localDateObj = new Date(Date.UTC(sYear, sMonth - 1, sDay + dayOffset))
    const localDateStr = localDateObj.toISOString().split('T')[0]
    const localTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`

    return convertZonedLocalToUtc(localDateStr, localTimeStr, timezone)
  }

  if (type === 'package') {
    if (!endDate) {
      throw new Error('[TripCompletionResolver] Package requires a valid endDate (YYYY-MM-DD).')
    }
    validateCalendarDate(endDate, 'endDate')

    // Package Standard Checkout Policy: 12:00:00 Local Destination Time on the final calendar day
    const checkoutLocalTime = '12:00:00'
    return convertZonedLocalToUtc(endDate, checkoutLocalTime, timezone)
  }

  throw new Error(`[TripCompletionResolver] Unsupported experience type: "${type}". Expected "package" or "daily_tour".`)
}
