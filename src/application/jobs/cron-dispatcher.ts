import { getDomainServices } from '@/domains/factory'
import { MaintenanceLeaseService } from '@/domains/maintenance/lease-service'

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

    // Task 1: Refresh Live Exchange Rate Catalog Cache (Independent Lease)
    try {
      const acquired = await MaintenanceLeaseService.acquireLease(payload, 'currency_rate_refresh', CronDispatcher.workerId, 300000) // 5 minutes TTL
      if (acquired) {
        try {
          await currency.refreshRateCatalog()
          executedTasks.push('currency_rate_refresh')
        } finally {
          await MaintenanceLeaseService.releaseLease(payload, 'currency_rate_refresh', CronDispatcher.workerId)
        }
      } else {
        executedTasks.push('currency_rate_refresh_skipped_lease_held')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[CronDispatcher] Failed refreshRateCatalog:', errMsg)
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
    const symbol = Symbol.for('laube.cron.dispatcher.started')
    const globalContext = global as unknown as Record<symbol, boolean>
    if (globalContext[symbol]) return
    globalContext[symbol] = true

    // 0. Immediate Startup Recovery Sweep (Complete Finished Bookings)
    getDomainServices()
      .then(({ maintenance }) => {
        maintenance
          .triggerJob('complete_finished_bookings', 'scheduler', CronDispatcher.workerId)
          .catch((err: unknown) => {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error('[CronDispatcher] Startup trip completion sweep error:', errMsg)
          })
      })
      .catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[CronDispatcher] Failed resolving domain services for startup sweep:', errMsg)
      })

    // 1. 5-Minute Scheduled Tasks (Trip Completion Lifecycle Sweep)
    setInterval(() => {
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

    // 2. 1-Minute Scheduled Tasks (Hold Expiration Reaper)
    setInterval(() => {
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

    // 3. Hourly Scheduled Tasks (Exchange Rates, Reconciliation, Retention Purge)
    setInterval(() => {
      CronDispatcher.runHourlyJob().catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[CronDispatcher] Hourly job execution error:', errMsg)
      })
    }, 60 * 60 * 1000)

    if (process.env.ARCH_TRACE === 'true') {
      console.log(`[CronDispatcher] Schedulers (Startup + 5m completions, 1m holds, 1h maintenance) started successfully with worker ID: ${CronDispatcher.workerId}`)
    }
  }
}
