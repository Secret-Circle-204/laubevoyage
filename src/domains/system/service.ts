import type { Payload } from 'payload'
import { SystemIntegrationWorkflowEngine } from './workflow'
import type { SystemHealthReportDTO, ProductionReadinessDTO } from './types'

/**
 * System Integration Service (Master Enterprise Thin Facade)
 * Master single entry point for overall system boot, event bus wiring, and production readiness certification.
 */
export class SystemIntegrationService {
  private workflowEngine: SystemIntegrationWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new SystemIntegrationWorkflowEngine(payload)
  }

  async bootstrapSystem(): Promise<{ success: boolean; eventSubscribersCount: number }> {
    return this.workflowEngine.bootstrapSystem()
  }

  async getSystemHealth(): Promise<SystemHealthReportDTO> {
    return this.workflowEngine.getSystemHealth()
  }

  async certifyProductionReadiness(): Promise<ProductionReadinessDTO> {
    return this.workflowEngine.certifyProductionReadiness()
  }
}
