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
      customerName: data.customerName,
      tier: data.tier,
      points: data.points,
      activeBookingsCount: data.activeBookingsCount,
      recentBookings: data.recentBookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        experienceTitle: b.experienceTitle,
        experienceImage: b.experienceImage,
        departureDate: b.departureDate,
        passengersCount: b.passengersCount,
        totalCost: {
          amountEGP: b.totalCostEGP,
          displayAmount: `${b.totalCostEGP.toLocaleString()} EGP`,
          displayCurrency: 'EGP',
        },
        status: b.status,
      })),
    }
  }
}
