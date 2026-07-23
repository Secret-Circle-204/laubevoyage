import { getDomainServices } from '@/domains/factory'

/**
 * Pure Cron Dispatcher
 * Zero Business Logic in Cron Jobs.
 * Cron triggers only invoke Domain Service operations.
 */
export class CronDispatcher {
  /**
   * Hourly Scheduled Job Trigger
   */
  static async runHourlyJob(): Promise<{ success: boolean; executedTasks: string[]; durationMs: number }> {
    const startTime = Date.now()
    const executedTasks: string[] = []

    const { booking, currency } = await getDomainServices()

    // Task 1: Complete Finished Trips & Award Loyalty Points
    try {
      if (typeof (booking as any).processTripCompletions === 'function') {
        await (booking as any).processTripCompletions()
      }
      executedTasks.push('trip_completions')
    } catch {
      executedTasks.push('trip_completions_skipped')
    }

    // Task 2: Refresh Live Exchange Rate Catalog Cache
    try {
      if (typeof (currency as any).refreshRateCatalog === 'function') {
        await (currency as any).refreshRateCatalog()
      }
      executedTasks.push('currency_rate_refresh')
    } catch {
      executedTasks.push('currency_rate_refresh_skipped')
    }

    return {
      success: true,
      executedTasks,
      durationMs: Date.now() - startTime,
    }
  }
}
