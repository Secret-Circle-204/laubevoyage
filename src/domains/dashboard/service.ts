import type { Payload } from 'payload'
import { DashboardWorkflowEngine } from './workflow'
import type { CustomerPortalProjection, DashboardWidget, CustomerDocumentItem } from './types'
import { DashboardDocumentsHub } from './documents-hub'

/**
 * Dashboard Domain Service (Enterprise Thin Facade)
 * Single entry point for all Customer Portal queries and travel hub aggregations.
 */
export class DashboardService {
  private workflowEngine: DashboardWorkflowEngine

  constructor(payload: Payload) {
    this.workflowEngine = new DashboardWorkflowEngine(payload)
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
