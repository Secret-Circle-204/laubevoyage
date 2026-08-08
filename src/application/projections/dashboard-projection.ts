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
    options?: { locale?: string; currency?: string }
  ): Promise<CustomerPortalOverviewDTO> {
    const { loyalty: loyaltyService, localization } = await getDomainServices()
    const ctx = await localization.buildContext({
      cookieLocale: options?.locale,
      cookieCurrency: options?.currency,
    })

    const currentTier = data.tier.toLowerCase()
    const pts = data.points

    const loyaltyConfig = await loyaltyService.getActiveConfig()
    const voyagerThresholdEGP = loyaltyConfig.tiers[LoyaltyTier.VOYAGER]?.minSpentEGP || 10000
    const eliteThresholdEGP = loyaltyConfig.tiers[LoyaltyTier.ELITE]?.minSpentEGP || 50000

    const voyagerPoints = voyagerThresholdEGP * loyaltyConfig.baseEarnRate
    const elitePoints = eliteThresholdEGP * loyaltyConfig.baseEarnRate

    let pointsToNextTier = 0
    let nextTierName = ''

    if (currentTier === 'explorer') {
      pointsToNextTier = Math.max(0, voyagerPoints - pts)
      nextTierName = 'Voyager'
    } else if (currentTier === 'voyager') {
      pointsToNextTier = Math.max(0, elitePoints - pts)
      nextTierName = 'Elite'
    } else {
      pointsToNextTier = 0
      nextTierName = 'Elite (Max Tier)'
    }

    const nextTierTranslated = nextTierName ? await localization.translateText(nextTierName, ctx) : ''

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
      })
    )

    return {
      customerId: data.customerId || 0,
      fullName: data.customerName,
      email: data.email || '',
      tier: data.tier.toLowerCase() as 'explorer' | 'voyager' | 'elite',
      points: data.points,
      nextTierProgressPercent: 0,
      pointsToNextTier,
      nextTierName: nextTierTranslated,
      activeBookingsCount: data.activeBookingsCount,
      unreadNotificationsCount: 0,
      recentBookings,
    }
  }
}
