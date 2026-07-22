import type { Payload } from 'payload'
import { SystemRepository } from './repository'
import { MasterEventBus } from './master-event-bus'
import { registerDashboardProjectionSubscribers } from '../events/subscribers/dashboard-subscriber'
import { registerNotificationSubscribers } from '../events/subscribers/notification-subscriber'
import type { SystemHealthReportDTO, ProductionReadinessDTO } from './types'

/**
 * System Integration Workflow Engine
 * Central orchestrator handling system boot initialization, event bus wiring, and readiness certification.
 */
export class SystemIntegrationWorkflowEngine {
  public repository: SystemRepository
  private isBootstrapped = false

  constructor(payload: Payload) {
    this.repository = new SystemRepository(payload)
  }

  async bootstrapSystem(): Promise<{ success: boolean; eventSubscribersCount: number }> {
    if (this.isBootstrapped) {
      return { success: true, eventSubscribersCount: 4 }
    }

    // 1. Wire Master Event Bus Subscribers
    MasterEventBus.clearSubscribers()
    registerDashboardProjectionSubscribers()
    registerNotificationSubscribers()

    this.isBootstrapped = true

    return { success: true, eventSubscribersCount: 4 }
  }

  async getSystemHealth(): Promise<SystemHealthReportDTO> {
    return this.repository.getHealthReport()
  }

  async certifyProductionReadiness(): Promise<ProductionReadinessDTO> {
    return this.repository.certifyReadiness()
  }
}
