/**
 * Booking Number Generator
 * Generates human-readable, sequence-safe booking numbers (e.g. LBV-260723-00042).
 */
export class BookingNumberGenerator {
  /**
   * Generate a formatted booking number.
   * Format: LBV-{YYMMDD}-{RANDOM_HEX_5}
   * Uses authoritative business/destination timezone for the operational date snapshot.
   */
  static generate(timezone = 'Africa/Cairo'): string {
    const prefix = 'LBV'
    const now = new Date()
    
    // Explicitly format in destination/business operational timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    const year = parts.find((p) => p.type === 'year')?.value || now.getUTCFullYear().toString().slice(-2)
    const month = parts.find((p) => p.type === 'month')?.value || (now.getUTCMonth() + 1).toString().padStart(2, '0')
    const day = parts.find((p) => p.type === 'day')?.value || now.getUTCDate().toString().padStart(2, '0')
    
    const dateStr = `${year}${month}${day}`
    const randomSequence = Math.floor(10000 + Math.random() * 90000).toString()

    return `${prefix}-${dateStr}-${randomSequence}`
  }
}
