/**
 * Notification Rate Limiter
 * Enforces anti-spam policy (e.g. max 3 OTP requests per minute per recipient).
 */
export class NotificationRateLimiter {
  private static requestHistory: Map<string, number[]> = new Map()

  static isRateLimited(recipient: string, limitPerMinute = 3): boolean {
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute
    const history = this.requestHistory.get(recipient) || []

    const validHistory = history.filter((t) => now - t < windowMs)

    if (validHistory.length >= limitPerMinute) {
      return true // Rate limited!
    }

    validHistory.push(now)
    this.requestHistory.set(recipient, validHistory)
    return false
  }
}
