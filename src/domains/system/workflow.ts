import type { Payload } from 'payload'
import { SystemRepository } from './repository'
import { MasterEventBus } from './master-event-bus'
import { registerDashboardProjectionSubscribers } from '../events/subscribers/dashboard-subscriber'
import { registerNotificationSubscribers } from '../events/subscribers/notification-subscriber'
import { registerCustomerSubscribers } from '../events/subscribers/customer-subscriber'
import { registerLoyaltySubscriber } from '../events/subscribers/loyalty-subscriber'
import { registerBookingPaymentSubscriber } from '../events/subscribers/payment-subscriber'
import { registerLoyaltyNotificationSubscriber } from '../events/subscribers/loyalty-notification-subscriber'
import { registerInventorySubscriber } from '../events/subscribers/inventory-subscriber'
import {
  registerSystemCacheSubscriber,
  registerCurrencyCacheSubscriber,
  registerDestinationCacheSubscriber,
  registerContentCacheSubscriber,
} from '../events/subscribers/cache-subscribers'
import { registerPresentationSubscriber } from '../events/subscribers/presentation-subscriber'
import { EventBus } from '../events/event-bus'
import type { SystemHealthReportDTO, ProductionReadinessDTO } from './types'
import type { EventOutboxService } from '../events/outbox'
import type { NotificationService } from '../notification/service'
import type { CustomerService } from '../customer/service'
import type { LoyaltyService } from '../loyalty/service'
import { CronDispatcher } from '@/application/jobs/cron-dispatcher'

// Global key for tracking subscriber bootstrap status across request lifecycles
const BOOTSTRAP_SYMBOL = Symbol.for('laube.subscribers.bootstrapped')

export interface SystemBootstrapOptions {
  outboxService?: EventOutboxService
  notificationService?: NotificationService
  customerService?: CustomerService
  loyaltyService?: LoyaltyService
}

/**
 * System Integration Workflow Engine
 * Central orchestrator handling system boot initialization, event bus wiring, and readiness certification.
 */
export class SystemIntegrationWorkflowEngine {
  public repository: SystemRepository
  private payload: Payload
  private isBootstrapped = false

  constructor(payload: Payload) {
    this.payload = payload
    this.repository = new SystemRepository(payload)
  }

  private startInfrastructureWorkers(options?: SystemBootstrapOptions): void {
    options?.outboxService?.startWorker()
    options?.notificationService?.startWorker()
    CronDispatcher.startWorker()
  }

  private async runBootstrapRecovery(): Promise<void> {
    const pool = (this.payload?.db as any)?.pool
    if (!pool || typeof pool.query !== 'function') return

    try {
      // 1. Reset any event outbox records locked in 'processing' state where lock has expired
      const outboxResetQuery = `
        UPDATE event_outbox
        SET status = 'pending',
            worker_id = null,
            lock_expires_at = null,
            updated_at = NOW()
        WHERE status = 'processing' AND lock_expires_at <= NOW();
      `
      const outboxRes = await pool.query(outboxResetQuery)
      if (outboxRes.rowCount > 0 && process.env.ARCH_TRACE === 'true') {
        console.log(`[SystemBootstrap] Recovered ${outboxRes.rowCount} orphaned/expired outbox processing locks.`)
      }

      // 2. Delete any expired maintenance leases
      const leaseCleanupQuery = `
        CREATE TABLE IF NOT EXISTS maintenance_leases (
          id SERIAL PRIMARY KEY,
          lease_key VARCHAR(255) UNIQUE NOT NULL,
          lease_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        DELETE FROM maintenance_leases
        WHERE lease_expires_at <= NOW();
      `
      const leaseRes = await pool.query(leaseCleanupQuery)
      if (leaseRes.rowCount > 0 && process.env.ARCH_TRACE === 'true') {
        console.log(`[SystemBootstrap] Cleaned up ${leaseRes.rowCount} expired maintenance leases.`)
      }
    } catch (error) {
      console.error('[SystemBootstrap] Error running bootstrap recovery routines:', error)
    }
  }

  async bootstrapSystem(options?: SystemBootstrapOptions): Promise<{ success: boolean; eventSubscribersCount: number }> {
    // 1. Immutable Composition Root Guard: Ensure bootstrap happens exactly once per process
    if ((global as any)[BOOTSTRAP_SYMBOL] || this.isBootstrapped) {
      return { success: true, eventSubscribersCount: 7 }
    }

    // Mark as bootstrapped immediately to prevent recursive re-entry
    ;(global as any)[BOOTSTRAP_SYMBOL] = true
    this.isBootstrapped = true

    // 2. Wire Master Event Bus Subscribers (Clean Drizzle and Payload listeners)
    MasterEventBus.clearSubscribers()

    if (
      !options?.customerService ||
      !options?.loyaltyService ||
      !options?.notificationService
    ) {
      throw new Error(
        '[SystemWorkflowEngine] Bootstrap failed: required dependencies (customerService, loyaltyService, notificationService) are missing in options.',
      )
    }

    registerDashboardProjectionSubscribers(this.payload)
    registerNotificationSubscribers(this.payload)
    registerCustomerSubscribers(this.payload)
    registerLoyaltySubscriber(this.payload, options.customerService, options.loyaltyService)
    registerBookingPaymentSubscriber(this.payload)
    registerLoyaltyNotificationSubscriber(options.customerService, options.notificationService)
    registerInventorySubscriber(this.payload)

    // Event-driven RAM registry cache invalidators (Safe for all node runtimes/workers)
    registerSystemCacheSubscriber()
    registerCurrencyCacheSubscriber()
    registerDestinationCacheSubscriber()
    registerContentCacheSubscriber()

    // Next.js Presentation Cache Revalidation Subscriber (Isolated to app server request process)
    let revalidatorsRegistered = 0
    if (process.env.NEXT_RUNTIME || process.env.NEXT_ENV === 'true') {
      registerPresentationSubscriber()
      revalidatorsRegistered = 1
    }

    return { success: true, eventSubscribersCount: 11 + revalidatorsRegistered }
  }

  async startBackgroundWorkers(options?: SystemBootstrapOptions): Promise<void> {
    const symbol = Symbol.for('laube.system.workers.started')
    if ((global as any)[symbol]) return
    ;(global as any)[symbol] = true

    // Run database-level bootstrap recovery routines
    await this.runBootstrapRecovery()

    // Start Infrastructure Background Workers
    this.startInfrastructureWorkers(options)
  }

  async getSystemHealth(): Promise<SystemHealthReportDTO> {
    return this.repository.getHealthReport()
  }

  async certifyProductionReadiness(): Promise<ProductionReadinessDTO> {
    return this.repository.certifyReadiness()
  }
}
