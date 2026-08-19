import type { DashboardQueryBus } from './query-bus'
import type { CustomerPortalProjection } from './types'
import { DashboardMetrics } from './metrics'
import { LoyaltyTier } from '@/types'
import { TierPolicy } from '../loyalty/tier-policy'

/**
 * High-Speed Parallel Overview Aggregator
 * Assembles CustomerPortalProjection DTO using non-blocking Promise.all() execution across query bus within <50ms.
 */
export class DashboardOverviewAggregator {
  private queryBus: DashboardQueryBus

  constructor(queryBus: DashboardQueryBus) {
    this.queryBus = queryBus
  }

  async aggregatePortalOverview(customerId: number): Promise<CustomerPortalProjection> {
    const startTime = performance.now()

    // Parallel non-blocking read aggregation (Strict Fail-Fast: let any query error bubble up)
    const [customer, loyaltyProjection, tripSummary, activeConfig, actualBalance, activeSessions] =
      await Promise.all([
        this.queryBus.customerQueries.getById(customerId),
        this.queryBus.loyaltyQueries.getProjection(customerId),
        this.queryBus.bookingQueries.getCustomerTripSummary(customerId),
        this.queryBus.loyaltyQueries.getActiveProgramConfig(),
        this.queryBus.loyaltyQueries.getBalance(customerId),
        this.queryBus.customerQueries.getActiveSessions(customerId),
      ])

    if (!customer) {
      throw new Error(`[CustomerNotFoundException] Customer with ID ${customerId} not found in database.`)
    }
    if (!loyaltyProjection) {
      throw new Error(`[LoyaltyProjectionNotFoundException] Loyalty projection for customer ID ${customerId} not found.`)
    }
    if (!activeConfig) {
      throw new Error('[LoyaltyProgramConfigurationException] Active loyalty program configuration is missing.')
    }

    const durationMs = performance.now() - startTime

    const totalSpent = loyaltyProjection.totalSpentEGP
    const ordered = TierPolicy.getOrderedTiers(activeConfig)
    const defaultTier = ordered[0].tier

    return {
      projectionId: `proj_${customerId}_${Date.now()}`,
      customerId,
      customer: {
        customerId,
        email: customer.email,
        fullName: customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        isEmailVerified: !!customer.isEmailVerified,
        status: customer.status || 'active',
        preferredCurrency: customer.preferredCurrency || 'EGP',
      },
      loyalty: {
        tier: loyaltyProjection.tier || defaultTier,
        pointsBalance: actualBalance || 0,
        activeHoldsCount: 0,
        totalSpentEGP: totalSpent,
      },
      trips: {
        upcomingCount: tripSummary.upcomingCount,
        activeBookingsCount: tripSummary.activeBookingsCount,
        latestBookingNumber: tripSummary.latestBookingNumber,
        nextDepartureDate: tripSummary.nextDepartureDate,
      },

      security: {
        activeDeviceCount: activeSessions.length,
        lastLoginAt: customer.lastLoginAt,
      },
      metrics: DashboardMetrics.createMetrics(false, durationMs),
      version: 1,
      updatedAt: new Date().toISOString(),
    }
  }
}
