import { DashboardWorkflowEngine } from './workflow'
import { DashboardProjectionRepository } from './repository'
import type { CustomerPortalProjection, DashboardWidget, CustomerDocumentItem } from './types'
import { DashboardDocumentsHub } from './documents-hub'
import type { DashboardQueryBus } from './query-bus'

/**
 * Dashboard Domain Service (Enterprise Thin Facade)
 * Single entry point for all Customer Portal queries and travel hub aggregations via Dependency Injection.
 */
export class DashboardService {
  private repository: DashboardProjectionRepository
  private workflowEngine: DashboardWorkflowEngine

  constructor(repository: DashboardProjectionRepository, queryBus?: DashboardQueryBus) {
    this.repository = repository
    this.workflowEngine = new DashboardWorkflowEngine(repository, queryBus)
  }

  async getPortalOverview(customerId: number): Promise<CustomerPortalProjection> {
    return this.workflowEngine.executePortalOverviewWorkflow(customerId)
  }

  async getWidgets(customerId: number): Promise<DashboardWidget[]> {
    return this.workflowEngine.getWidgets(customerId)
  }

  async getDocuments(bookingNumber: string): Promise<CustomerDocumentItem[]> {
    return DashboardDocumentsHub.getCustomerDocuments(bookingNumber)
  }
}
