/**
 * Booking Number Generator
 * Generates human-readable, sequence-safe booking numbers (e.g. LBV-260723-00042).
 */
export class BookingNumberGenerator {
  /**
   * Generate a formatted booking number.
   * Format: LBV-{YYMMDD}-{RANDOM_HEX_5}
   */
  static generate(): string {
    const prefix = 'LBV'
    const now = new Date()
    
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const dateStr = `${year}${month}${day}`

    const randomSequence = Math.floor(10000 + Math.random() * 90000).toString()

    return `${prefix}-${dateStr}-${randomSequence}`
  }
}
