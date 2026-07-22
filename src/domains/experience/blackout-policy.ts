import type { AvailabilityPolicyResult } from './types'

export interface BlackoutEntry {
  date: string
  reason: string
  createdBy: string
  createdAt: string
}

/**
 * Structured Blackout Policy
 * Validates blackout dates for departure slots with explicit administrative reasons.
 */
export class BlackoutPolicy {
  static isDateBlackedOut(date: string, blackoutEntries: BlackoutEntry[]): AvailabilityPolicyResult {
    const entry = blackoutEntries.find((b) => b.date === date)
    if (entry) {
      return {
        allowed: false,
        code: 'BLACKED_OUT',
        reason: `Date ${date} is blacked out: ${entry.reason}`,
      }
    }

    return { allowed: true }
  }
}
