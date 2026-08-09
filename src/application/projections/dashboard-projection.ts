import type { CustomerPortalOverviewDTO } from '../dashboard/dto'
import { getDomainServices } from '@/domains/factory'
import { LoyaltyTier } from '@/types'

/**
 * Dashboard Projection Module (Read Model Optimization)
 * Generates pre-assembled, zero-calculation read models for instant Customer Portal rendering
 */
export class DashboardProjection {
  public static async projectOverview(
    data: {
      customerId?: number
      email?: string
      customerName: string
      tier: 'Explorer' | 'Voyager' | 'Elite'
      points: number
      totalSpentEGP: number
      activeBookingsCount: number
      recentBookings: Array<{
        id: number
        reference: string
        experienceTitle: string
        experienceImage: string
        departureDate: string
        passengersCount: number
        totalCostEGP: number
        status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
      }>
    },
    options?: { locale?: string; currency?: string },
  ): Promise<CustomerPortalOverviewDTO> {
    const { loyalty: loyaltyService, localization } = await getDomainServices()
    const ctx = await localization.buildContext({
      cookieLocale: options?.locale,
      cookieCurrency: options?.currency,
    })

    const currentTier = data.tier.toLowerCase()
    const pts = data.points

    const loyaltyConfig = await loyaltyService.getActiveConfig()
    
    // Calculate dynamic progression in EGP Qualifying Spend (Domain Method)
    const tierProgress = loyaltyService.calculateTierProgress(
      data.totalSpentEGP,
      currentTier as LoyaltyTier,
      loyaltyConfig
    )

    const tierThresholdsArray = loyaltyService.getTierThresholds(loyaltyConfig)

    const formattedRemaining = tierProgress.remainingQualifyingSpendEGP !== null
      ? await localization.formatPrice(tierProgress.remainingQualifyingSpendEGP, ctx)
      : null
    const formattedRemainingQualifyingSpend = formattedRemaining ? formattedRemaining.formatted : null

    const nextTierName = tierProgress.nextTier ? tierProgress.nextTier : 'Elite (Max Tier)'
    const nextTierTranslated = tierProgress.nextTier
      ? await localization.translateText(tierProgress.nextTier, ctx)
      : ''

    const formattedPoints = localization.formatNumber(pts, ctx)

    const tierThresholds = await Promise.all(
      tierThresholdsArray.map(async (t) => {
        const formatted = await localization.formatPrice(t.minSpentEGP, ctx)
        return {
          tier: t.tier,
          minSpentEGP: t.minSpentEGP,
          formattedMinSpent: formatted.formatted,
        }
      })
    )

    const recentBookings = await Promise.all(
      data.recentBookings.map(async (b) => {
        const formattedCost = await localization.formatPrice(b.totalCostEGP, ctx)
        return {
          id: b.id,
          reference: b.reference,
          experienceTitle: b.experienceTitle,
          experienceImage: b.experienceImage,
          departureDate: b.departureDate,
          passengersCount: b.passengersCount,
          totalCost: formattedCost,
          status: b.status,
        }
      }),
    )

    // Convert EGP redemption value using context display currency and format it
    const formattedRedemption = await localization.formatPrice(loyaltyConfig.redemptionValueEGP, ctx)

    const redemptionRate = {
      pointsUnit: loyaltyConfig.redemptionPointsUnit,
      baseValue: loyaltyConfig.redemptionValueEGP,
      baseCurrency: 'EGP',
      displayValue: formattedRedemption.formatted,
    }

    return {
      customerId: data.customerId || 0,
      fullName: data.customerName,
      email: data.email || '',
      currentTier: data.tier.toLowerCase() as 'explorer' | 'voyager' | 'elite',
      points: data.points,
      formattedPoints,
      nextTierProgressPercent: 0,
      currentQualifyingSpendEGP: data.totalSpentEGP,
      remainingQualifyingSpendEGP: tierProgress.remainingQualifyingSpendEGP,
      formattedRemainingQualifyingSpend,
      nextTierName: nextTierTranslated,
      activeBookingsCount: data.activeBookingsCount,
      unreadNotificationsCount: 0,
      recentBookings,
      tierThresholds,
      redemptionRate,
    }
  }
}
