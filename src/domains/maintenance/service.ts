import { MaintenanceWorkflowEngine } from './workflow'
import { MaintenanceRepository } from './repository'
import type { MaintenanceJobName } from './types'
import type { BookingService } from '../booking/service'
import type { CurrencyService } from '../currency/service'
import type { DashboardProjectionRepository } from '../dashboard/repository'
import type { DashboardOverviewAggregator } from '../dashboard/overview-aggregator'

/**
 * Maintenance Domain Service (Enterprise Thin Facade)
 * Single entry point for background maintenance job scheduling via Constructor Dependency Injection.
 */
export class MaintenanceService {
  private repository: MaintenanceRepository
  private workflowEngine: MaintenanceWorkflowEngine

  constructor(
    repository: MaintenanceRepository,
    bookingService: BookingService,
    currencyService?: CurrencyService,
    dashboardRepo?: DashboardProjectionRepository,
    overviewAggregator?: DashboardOverviewAggregator,
  ) {
    this.repository = repository
    this.workflowEngine = new MaintenanceWorkflowEngine(
      repository,
      bookingService,
      currencyService,
      dashboardRepo,
      overviewAggregator,
    )
  }

  async triggerJob(
    jobName: MaintenanceJobName,
    startedBy: 'scheduler' | 'manual_admin' | 'api',
    workerId: string,
  ) {
    if (!jobName) {
      throw new Error('[MaintenanceService] triggerJob: jobName is required.')
    }
    if (!startedBy) {
      throw new Error('[MaintenanceService] triggerJob: startedBy is required.')
    }
    if (!workerId) {
      throw new Error('[MaintenanceService] triggerJob: workerId is required.')
    }
    return this.workflowEngine.executeJobWorkflow(jobName, startedBy, workerId)
  }
}
