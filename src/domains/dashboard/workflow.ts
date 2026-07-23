import type { Payload } from 'payload'
import { DashboardQueryBus } from './query-bus'
import { DashboardProjectionRepository } from './repository'
import { DashboardOverviewAggregator } from './overview-aggregator'
import { DashboardBookingHub } from './booking-hub'
import { DashboardLoyaltyHub } from './loyalty-hub'
import { DashboardProfileHub } from './profile-hub'
import { DashboardPolicy } from './policy'
import type { CustomerPortalProjection, DashboardWidget } from './types'
import { DashboardWidgetProvider } from './widget-provider'
import { DashboardMetrics } from './metrics'
import { CustomerRepository } from '../customer/repositories/customer-repository'
import { LoyaltyRepository } from '../loyalty/repository'
import { BookingRepository } from '../booking/repository'

/**
 * Dashboard Workflow Engine
 * Central deterministic orchestrator for Customer Portal assembly via Constructor Dependency Injection.
 * Checks CQRS Read Model projection cache first (<5ms), falling back to parallel aggregation (<50ms).
 */
export class DashboardWorkflowEngine {
  public queryBus: DashboardQueryBus
  public repository: DashboardProjectionRepository
  public overviewAggregator: DashboardOverviewAggregator
  public bookingHub: DashboardBookingHub
  public loyaltyHub: DashboardLoyaltyHub
  public profileHub: DashboardProfileHub

  constructor(
    repository?: DashboardProjectionRepository | Payload,
    queryBus?: DashboardQueryBus | Payload,
  ) {
    if (repository && 'findByCustomerId' in repository) {
      this.repository = repository as DashboardProjectionRepository
    } else {
      this.repository = new DashboardProjectionRepository(repository as Payload)
    }

    if (queryBus && 'customerQueries' in queryBus) {
      this.queryBus = queryBus as DashboardQueryBus
    } else {
      const activePayload = (queryBus || repository) as Payload
      const customerRepo = new CustomerRepository(activePayload)
      const loyaltyRepo = new LoyaltyRepository(activePayload)
      const bookingRepo = new BookingRepository(activePayload)
      this.queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo)
    }

    this.overviewAggregator = new DashboardOverviewAggregator(this.queryBus)
    this.bookingHub = new DashboardBookingHub(this.queryBus)
    this.loyaltyHub = new DashboardLoyaltyHub(this.queryBus)
    this.profileHub = new DashboardProfileHub(this.queryBus)
  }

  /**
   * Execute Portal Overview Workflow:
   * 1. Check CQRS Projection Cache (<5ms)
   * 2. If Cache Miss: Run parallel overview aggregator & cache projection
   */
  async executePortalOverviewWorkflow(customerId: number): Promise<CustomerPortalProjection> {
    const startTime = performance.now()

    // 1. Policy check
    const policyResult = DashboardPolicy.canAccessPortal('active')
    if (!policyResult.allowed) {
      throw new Error(`[DashboardPolicy] Access denied: ${policyResult.reason}`)
    }

    // 2. Try CQRS Projection Cache
    const cached = await this.repository.findByCustomerId(customerId)
    if (cached) {
      const durationMs = performance.now() - startTime
      return {
        ...cached,
        metrics: DashboardMetrics.createMetrics(true, durationMs),
      }
    }

    // 3. Fallback: Aggregate parallel read-models
    const projection = await this.overviewAggregator.aggregatePortalOverview(customerId)
    await this.repository.saveProjection(projection)

    return projection
  }

  async getWidgets(customerId: number): Promise<DashboardWidget[]> {
    const projection = await this.executePortalOverviewWorkflow(customerId)
    return DashboardWidgetProvider.buildWidgets(projection)
  }
}
