import type { DashboardQueryBus } from './query-bus'
import type { CustomerPortalProjection } from './types'
import { DashboardMetrics } from './metrics'
import { LoyaltyTier } from '@/types'
import { TierPolicy } from '../loyalty/tier-policy'
import { CustomerNotFoundException } from '@/domains/shared/exceptions/domain-exception'

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
    const [
      customer,
      loyaltyProjection,
      tripSummary,
      activeConfig,
      actualBalance,
      heldSummary,
    ] = await Promise.all([
      this.queryBus.customerQueries.getById(customerId),
      this.queryBus.loyaltyQueries.getProjection(customerId),
      this.queryBus.bookingQueries.getCustomerTripSummary(customerId),
      this.queryBus.loyaltyQueries.getActiveProgramConfig(),
      this.queryBus.loyaltyQueries.getBalance(customerId),
      this.queryBus.bookingQueries.getActiveHeldPointsSummaryForCustomer(customerId),
    ])

    if (!customer) {
      throw new CustomerNotFoundException(customerId)
    }
    if (!loyaltyProjection) {
      throw new Error(
        `[LoyaltyProjectionNotFoundException] Loyalty projection for customer ID ${customerId} not found.`,
      )
    }
    if (!activeConfig) {
      throw new Error(
        '[LoyaltyProgramConfigurationException] Active loyalty program configuration is missing.',
      )
    }

    const durationMs = performance.now() - startTime

    const totalSpent = loyaltyProjection.totalSpentEGP
    const ordered = TierPolicy.getOrderedTiers(activeConfig)
    const defaultTier = ordered[0].tier

    const activeHeldPoints = heldSummary?.totalPoints || 0
    const activeHoldsCount = heldSummary?.count || 0
    const availablePoints = Math.max(0, (actualBalance || 0) - activeHeldPoints)

    return {
      projectionId: `proj_${customerId}_${Date.now()}`,
      customerId,
      customer: {
        customerId,
        email: customer.email,
        fullName:
          customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        isEmailVerified: !!customer.isEmailVerified,
        status: customer.status,
        preferredCurrency: customer.preferredCurrency,
      },
      loyalty: {
        tier: loyaltyProjection.tier || defaultTier,
        pointsBalance: availablePoints,
        activeHoldsCount: activeHoldsCount,
        totalSpentEGP: totalSpent,
      },
      trips: {
        upcomingCount: tripSummary.upcomingCount,
        activeBookingsCount: tripSummary.activeBookingsCount,
        latestBookingNumber: tripSummary.latestBookingNumber,
        nextDepartureDate: tripSummary.nextDepartureDate,
      },

      security: {
        activeDeviceCount: customer.lastLoginAt ? 1 : 0,
        lastLoginAt: customer.lastLoginAt,
      },
      metrics: DashboardMetrics.createMetrics(false, durationMs),
      version: 1,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Targeted Slice: Loyalty Wallet (Live SSOT from point-ledger, bookings holds, and customer tier)
   */
  async calculateLoyaltySlice(customerId: number): Promise<CustomerPortalProjection['loyalty']> {
    const [loyaltyProjection, activeConfig, actualBalance, heldSummary] = await Promise.all([
      this.queryBus.loyaltyQueries.getProjection(customerId),
      this.queryBus.loyaltyQueries.getActiveProgramConfig(),
      this.queryBus.loyaltyQueries.getBalance(customerId),
      this.queryBus.bookingQueries.getActiveHeldPointsSummaryForCustomer(customerId),
    ])

    const totalSpent = loyaltyProjection?.totalSpentEGP || 0
    const ordered = activeConfig ? TierPolicy.getOrderedTiers(activeConfig) : []
    const defaultTier = ordered[0]?.tier || ('explorer' as LoyaltyTier)

    const activeHeldPoints = heldSummary?.totalPoints || 0
    const activeHoldsCount = heldSummary?.count || 0
    const availablePoints = Math.max(0, (actualBalance || 0) - activeHeldPoints)

    return {
      tier: loyaltyProjection?.tier || defaultTier,
      pointsBalance: availablePoints,
      activeHoldsCount,
      totalSpentEGP: totalSpent,
    }
  }

  /**
   * Targeted Slice: Active Trips Summary (Live SSOT from bookings)
   */
  async calculateTripsSlice(customerId: number): Promise<CustomerPortalProjection['trips']> {
    const tripSummary = await this.queryBus.bookingQueries.getCustomerTripSummary(customerId)
    return {
      upcomingCount: tripSummary?.upcomingCount || 0,
      activeBookingsCount: tripSummary?.activeBookingsCount || 0,
      latestBookingNumber: tripSummary?.latestBookingNumber,
      nextDepartureDate: tripSummary?.nextDepartureDate,
    }
  }

  /**
   * Targeted Slice: Customer Identity & Profile (Live SSOT from customers)
   */
  async calculateCustomerSlice(customerId: number): Promise<CustomerPortalProjection['customer']> {
    const customer = await this.queryBus.customerQueries.getById(customerId)
    if (!customer) {
      throw new CustomerNotFoundException(customerId)
    }
    return {
      customerId,
      email: customer.email,
      fullName:
        customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      isEmailVerified: !!customer.isEmailVerified,
      status: customer.status,
      preferredCurrency: customer.preferredCurrency,
    }
  }

  /**
   * Targeted Slice: Security & Session Status
   */
  async calculateSecuritySlice(customerId: number): Promise<CustomerPortalProjection['security']> {
    const customer = await this.queryBus.customerQueries.getById(customerId)
    return {
      activeDeviceCount: customer?.lastLoginAt ? 1 : 0,
      lastLoginAt: customer?.lastLoginAt,
    }
  }
}
