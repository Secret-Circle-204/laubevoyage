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
import type { SystemHealthReportDTO, ProductionReadinessDTO } from './types'

// Global key for tracking subscriber bootstrap status across request lifecycles
const BOOTSTRAP_SYMBOL = Symbol.for('laube.subscribers.bootstrapped')

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

  async bootstrapSystem(): Promise<{ success: boolean; eventSubscribersCount: number }> {
    // 1. Prevent duplicate registration in production environments
    if (
      process.env.NODE_ENV !== 'development' &&
      ((global as any)[BOOTSTRAP_SYMBOL] || this.isBootstrapped)
    ) {
      return { success: true, eventSubscribersCount: 7 }
    }

    // 2. Wire Master Event Bus Subscribers (Clean Drizzle and Payload listeners)
    MasterEventBus.clearSubscribers()

    registerDashboardProjectionSubscribers(this.payload)
    registerNotificationSubscribers(this.payload)
    registerCustomerSubscribers(this.payload)
    registerLoyaltySubscriber(this.payload)
    registerBookingPaymentSubscriber(this.payload)
    registerLoyaltyNotificationSubscriber(this.payload)
    registerInventorySubscriber(this.payload)

    // Mark as bootstrapped globally and locally
    ;(global as any)[BOOTSTRAP_SYMBOL] = true
    this.isBootstrapped = true

    return { success: true, eventSubscribersCount: 7 }
  }

  async getSystemHealth(): Promise<SystemHealthReportDTO> {
    return this.repository.getHealthReport()
  }

  async certifyProductionReadiness(): Promise<ProductionReadinessDTO> {
    return this.repository.certifyReadiness()
  }
}
