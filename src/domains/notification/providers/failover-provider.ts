import type { INotificationProvider, NotificationDispatchResult } from './provider.interface'
import type { NotificationJobEntity } from '../types'

/**
 * Failover Notification Provider Chain
 * Executes primary provider, and seamlessly falls back to secondary/tertiary providers if primary fails.
 */
export class FailoverNotificationProvider implements INotificationProvider {
  private providers: INotificationProvider[]

  constructor(providers: INotificationProvider[]) {
    this.providers = providers
  }

  async send(job: NotificationJobEntity): Promise<NotificationDispatchResult> {
    let lastError = 'No providers configured'

    for (const provider of this.providers) {
      try {
        const result = await provider.send(job)
        if (result.success) {
          return result
        }
        lastError = result.error || 'Provider execution failed'
      } catch (err: any) {
        lastError = err.message
        console.warn(`[FailoverNotificationProvider] Primary provider failed: ${err.message}. Trying next fallback...`)
      }
    }

    return { success: false, error: lastError }
  }
}
