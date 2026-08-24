import type { AvailabilityPolicyResult } from './types'

export interface BlackoutEntry {
  date: string
  startTime?: string
  reason?: string
  createdBy?: string
  createdAt?: string
}

/**
 * Structured Blackout Policy
 * Validates blackout dates for departure slots or recurring schedules with explicit administrative reasons.
 */
export class BlackoutPolicy {
  static isDateBlackedOut(
    date: string,
    startTimeOrEntries?: string | BlackoutEntry[],
    blackoutEntries?: BlackoutEntry[],
  ): AvailabilityPolicyResult {
    let startTime: string | undefined
    let entries: BlackoutEntry[] | undefined

    if (Array.isArray(startTimeOrEntries)) {
      entries = startTimeOrEntries
      startTime = undefined
    } else {
      startTime = startTimeOrEntries
      entries = blackoutEntries
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return { allowed: true }
    }

    const cleanDate = date.split('T')[0]
    const entry = entries.find((b) => {
      const entryDate = b.date ? b.date.split('T')[0] : ''
      if (entryDate !== cleanDate) return false
      // If blackout has no specific startTime or is 'all', it blocks the entire date
      if (!b.startTime || b.startTime === 'all') return true
      // If startTime is specified, it blocks this specific time
      return startTime ? b.startTime === startTime : true
    })

    if (entry) {
      const timeNote = entry.startTime && entry.startTime !== 'all' ? ` at ${entry.startTime}` : ''
      const reasonNote = entry.reason ? `: ${entry.reason}` : ''
      return {
        allowed: false,
        code: 'BLACKED_OUT',
        reason: `Date ${cleanDate}${timeNote} is unavailable${reasonNote}`,
      }
    }

    return { allowed: true }
  }
}
