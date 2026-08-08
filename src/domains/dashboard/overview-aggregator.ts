import type { DashboardQueryBus } from './query-bus'
import type { CustomerPortalProjection } from './types'
import { DashboardMetrics } from './metrics'
import { LoyaltyTier } from '@/types'

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
    const [customer, loyaltyProjection, activeBookings, activeConfig] = await Promise.all([
      this.queryBus.customerQueries.getById(customerId),
      this.queryBus.loyaltyQueries.getProjection(customerId),
      this.queryBus.bookingQueries.getByCustomerId(customerId),
      this.queryBus.loyaltyQueries.getActiveProgramConfig(),
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

    const voyagerThresholdEGP = activeConfig.tiers?.voyager?.minSpentEGP
    const eliteThresholdEGP = activeConfig.tiers?.elite?.minSpentEGP

    if (typeof voyagerThresholdEGP !== 'number' || typeof eliteThresholdEGP !== 'number') {
      throw new Error(
        `[LoyaltyProgramConfigurationException] Loyalty program configuration is invalid: missing required voyager/elite minSpentEGP thresholds.`,
      )
    }

    const durationMs = performance.now() - startTime

    const totalSpent = loyaltyProjection.totalSpentEGP
    let tierProgressPercentage = 0

    const currentTier = loyaltyProjection.tier.toLowerCase()
    if (currentTier === 'explorer') {
      tierProgressPercentage = Math.min(100, Math.max(0, Math.round((totalSpent / voyagerThresholdEGP) * 100)))
    } else if (currentTier === 'voyager') {
      const spentInCurrentTier = totalSpent - voyagerThresholdEGP
      const tierRange = eliteThresholdEGP - voyagerThresholdEGP
      tierProgressPercentage = Math.min(100, Math.max(0, Math.round((spentInCurrentTier / tierRange) * 100)))
    } else {
      tierProgressPercentage = 100
    }

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
        tier: loyaltyProjection.tier || 'explorer',
        pointsBalance: loyaltyProjection.balance || 0,
        activeHoldsCount: 0,
        totalSpentEGP: totalSpent,
        tierProgressPercentage,
      },
      trips: {
        upcomingCount: activeBookings.filter((b) => b.status === 'confirmed').length,
        activeBookingsCount: activeBookings.length,
        latestBookingNumber: activeBookings[0]?.bookingNumber,
        nextDepartureDate: activeBookings[0]?.createdAt,
      },

      security: {
        activeDeviceCount: 1, // Read session telemetry is stubbed pending identity framework extension
        lastLoginAt: customer.lastLoginAt,
      },
      metrics: DashboardMetrics.createMetrics(false, durationMs),
      version: 1,
      updatedAt: new Date().toISOString(),
    }
  }
}
