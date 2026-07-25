/**
 * Resolves the current date string in the given business timezone.
 * Format: YYYY-MM-DD
 */
export function getBusinessDateString(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const month = parts.find((p) => p.type === 'month')?.value || ''
  const day = parts.find((p) => p.type === 'day')?.value || ''
  const year = parts.find((p) => p.type === 'year')?.value || ''
  return `${year}-${month}-${day}`
}
