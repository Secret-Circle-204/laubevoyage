import { getDomainServices } from '@/domains/factory'
import type { CustomerPortalOverviewDTO } from './dto'

export class CustomerPortalLoader {
  static async loadOverview(customerId: number = 1): Promise<CustomerPortalOverviewDTO> {
    try {
      const { dashboard } = await getDomainServices()
      const projection = await dashboard.getPortalOverview(customerId)

      return {
        customerId,
        fullName: projection?.customer?.fullName || '',
        email: projection?.customer?.email || '',
        tier: (projection?.loyalty?.tier || 'explorer') as 'explorer' | 'voyager' | 'elite',
        points: projection?.loyalty?.pointsBalance || 0,
        nextTierProgressPercent: projection?.loyalty?.tierProgressPercentage || 0,
        activeBookingsCount: projection?.trips?.activeBookingsCount || 0,
        recentBookings: [],
        unreadNotificationsCount: 0,
      }
    } catch {
      return {
        customerId,
        fullName: '',
        email: '',
        tier: 'explorer',
        points: 0,
        nextTierProgressPercent: 0,
        activeBookingsCount: 0,
        recentBookings: [],
        unreadNotificationsCount: 0,
      }
    }
  }
}
