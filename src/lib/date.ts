/**
 * Resolves the date string in the given business timezone for a specific instant (defaults to now).
 * Format: YYYY-MM-DD
 */
export function getBusinessDateString(timezone: string, now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const month = parts.find((p) => p.type === 'month')?.value || ''
  const day = parts.find((p) => p.type === 'day')?.value || ''
  const year = parts.find((p) => p.type === 'year')?.value || ''
  return `${year}-${month}-${day}`
}

/**
 * Adds integer number of days to a YYYY-MM-DD string strictly using UTC calendar arithmetic.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return d.toISOString().split('T')[0]
}
