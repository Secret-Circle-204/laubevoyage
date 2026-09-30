import { getDomainServices } from '@/domains/factory'
import { MaintenanceLeaseService } from '@/domains/maintenance/lease-service'

const CRON_TIMERS_KEY = Symbol.for('laube.cron.dispatcher.timers')

/**
 * Pure Cron Dispatcher
 * Zero Business Logic in Cron Jobs.
 * Cron triggers only invoke Domain Service operations.
 */
export class CronDispatcher {
  private static workerId = `worker_${process.pid || 'main'}_${Math.random().toString(36).substring(2, 7)}`

  /**
   * Hourly Scheduled Job Trigger
   */
  static async runHourlyJob(): Promise<{ success: boolean; executedTasks: string[]; durationMs: number }> {
    const startTime = Date.now()
    const executedTasks: string[] = []

    const { maintenance, currency, payload } = await getDomainServices()

    // Task 1: Refresh Live Exchange Rate Catalog Cache
    try {
      const res = await maintenance.triggerJob('currency_rate_refresh', 'scheduler', CronDispatcher.workerId)
      if (res.success) {
        executedTasks.push('currency_rate_refresh')
      } else {
        executedTasks.push('currency_rate_refresh_skipped_or_locked')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[CronDispatcher] Failed currency_rate_refresh job:', errMsg)
      executedTasks.push('currency_rate_refresh_failed')
    }

    // Task 2: Reconcile Pending Payments
    try {
      const res = await maintenance.triggerJob('financial_reconciliation', 'scheduler', CronDispatcher.workerId)
      if (res.success) {
        executedTasks.push('payment_reconciliation')
      } else {
        executedTasks.push('payment_reconciliation_skipped_or_locked')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[CronDispatcher] Failed payment reconciliation job:', errMsg)
      executedTasks.push('payment_reconciliation_failed')
    }

    // Task 3: Data Retention Purge (Hourly)
    try {
      const res = await maintenance.triggerJob('data_retention_purge', 'scheduler', CronDispatcher.workerId)
      if (res.success) {
        executedTasks.push('data_retention_purge')
      } else {
        executedTasks.push('data_retention_purge_skipped_or_locked')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[CronDispatcher] Failed data_retention_purge job:', errMsg)
      executedTasks.push('data_retention_purge_failed')
    }

    return {
      success: true,
      executedTasks,
      durationMs: Date.now() - startTime,
    }
  }

  public static startWorker(): void {
    const globalContext = globalThis as unknown as Record<typeof CRON_TIMERS_KEY, NodeJS.Timeout[]>
    const existingHandles = globalContext[CRON_TIMERS_KEY] || []

    // Cleanly cancel all prior timers
    for (const handle of existingHandles) {
      clearInterval(handle)
    }
    globalContext[CRON_TIMERS_KEY] = []

    // 0. Immediate Startup Recovery Sweep (Complete Finished Bookings & Reconcile Currency Rates)
    getDomainServices()
      .then(({ maintenance }) => {
        maintenance
          .triggerJob('complete_finished_bookings', 'scheduler', CronDispatcher.workerId)
          .catch((err: unknown) => {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error('[CronDispatcher] Startup trip completion sweep error:', errMsg)
          })

        maintenance
          .triggerJob('currency_rate_refresh', 'scheduler', CronDispatcher.workerId)
          .catch((err: unknown) => {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error('[CronDispatcher] Startup currency rate reconciliation error:', errMsg)
          })
      })
      .catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[CronDispatcher] Failed resolving domain services for startup sweep:', errMsg)
      })

    // 1. 5-Minute Scheduled Tasks (Trip Completion Lifecycle Sweep)
    const timer5m = setInterval(() => {
      getDomainServices()
        .then(({ maintenance }) => {
          maintenance
            .triggerJob('complete_finished_bookings', 'scheduler', CronDispatcher.workerId)
            .catch((err: unknown) => {
              const errMsg = err instanceof Error ? err.message : String(err)
              console.error('[CronDispatcher] Periodic trip completion execution error:', errMsg)
            })
        })
        .catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : String(err)
          console.error('[CronDispatcher] Failed resolving domain services for periodic completion sweep:', errMsg)
        })
    }, 5 * 60 * 1000)
    globalContext[CRON_TIMERS_KEY].push(timer5m)

    // 2. 1-Minute Scheduled Tasks (Hold Expiration Reaper)
    const timer1m = setInterval(() => {
      getDomainServices()
        .then(({ maintenance }) => {
          maintenance
            .triggerJob('expire_stale_holds', 'scheduler', CronDispatcher.workerId)
            .catch((err: unknown) => {
              const errMsg = err instanceof Error ? err.message : String(err)
              console.error('[CronDispatcher] Expiration reaper execution error:', errMsg)
            })
        })
        .catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : String(err)
          console.error('[CronDispatcher] Failed resolving domain services for hold expiration reaper:', errMsg)
        })
    }, 60 * 1000)
    globalContext[CRON_TIMERS_KEY].push(timer1m)

    // 3. Hourly Scheduled Tasks (Exchange Rates, Reconciliation, Retention Purge)
    const timer1h = setInterval(() => {
      CronDispatcher.runHourlyJob().catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[CronDispatcher] Hourly job execution error:', errMsg)
      })
    }, 60 * 60 * 1000)
    globalContext[CRON_TIMERS_KEY].push(timer1h)

    if (process.env.ARCH_TRACE === 'true') {
      console.log(`[CronDispatcher] Schedulers (Startup + 5m completions, 1m holds, 1h maintenance) started successfully with worker ID: ${CronDispatcher.workerId}`)
    }
  }

  public static stopWorker(): void {
    const globalContext = globalThis as unknown as Record<typeof CRON_TIMERS_KEY, NodeJS.Timeout[]>
    const existingHandles = globalContext[CRON_TIMERS_KEY] || []

    for (const handle of existingHandles) {
      clearInterval(handle)
    }
    globalContext[CRON_TIMERS_KEY] = []

    if (process.env.ARCH_TRACE === 'true') {
      console.log('[CronDispatcher] Schedulers stopped successfully.')
    }
  }

  public static isRunning(): boolean {
    const globalContext = globalThis as unknown as Record<typeof CRON_TIMERS_KEY, NodeJS.Timeout[]>
    return Array.isArray(globalContext[CRON_TIMERS_KEY]) && globalContext[CRON_TIMERS_KEY].length > 0
  }
}
