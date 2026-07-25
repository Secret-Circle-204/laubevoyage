import type { CustomerPortalOverviewDTO } from '../dashboard/dto'

/**
 * Dashboard Projection Module (Read Model Optimization)
 * Generates pre-assembled, zero-calculation read models for instant Customer Portal rendering
 */
export class DashboardProjection {
  public static projectOverview(data: {
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
  }): CustomerPortalOverviewDTO {
    return {
      customerId: 0,
      fullName: data.customerName,
      email: '',
      tier: data.tier.toLowerCase() as 'explorer' | 'voyager' | 'elite',
      points: data.points,
      nextTierProgressPercent: 0,
      activeBookingsCount: data.activeBookingsCount,
      unreadNotificationsCount: 0,
      recentBookings: data.recentBookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        experienceTitle: b.experienceTitle,
        experienceImage: b.experienceImage,
        departureDate: b.departureDate,
        passengersCount: b.passengersCount,
        totalCost: {
          baseAmountEGP: b.totalCostEGP,
          convertedAmount: b.totalCostEGP,
          currencyCode: 'EGP',
          currencySymbol: 'EGP',
          formatted: `${b.totalCostEGP.toLocaleString()} EGP`,
          exchangeRate: 1,
          decimals: 2,
        },
        status: b.status,
      })),
    }
  }
}
