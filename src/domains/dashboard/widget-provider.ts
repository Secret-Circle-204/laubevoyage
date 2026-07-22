import type { CustomerPortalProjection, DashboardWidget } from './types'

/**
 * Dashboard Widget Provider Engine
 * Generates dynamic modular UI widgets from CustomerPortalProjection read models.
 */
export class DashboardWidgetProvider {
  static buildWidgets(projection: CustomerPortalProjection): DashboardWidget[] {
    return [
      {
        widgetId: 'widget_upcoming_trips',
        title: 'Upcoming Trips',
        type: 'trips',
        data: {
          upcomingCount: projection.trips.upcomingCount,
          latestBookingNumber: projection.trips.latestBookingNumber,
          nextDepartureDate: projection.trips.nextDepartureDate,
        },
      },
      {
        widgetId: 'widget_loyalty_wallet',
        title: 'Loyalty & Rewards',
        type: 'loyalty',
        data: {
          tier: projection.loyalty.tier,
          pointsBalance: projection.loyalty.pointsBalance,
          tierProgressPercentage: projection.loyalty.tierProgressPercentage,
        },
      },
      {
        widgetId: 'widget_security',
        title: 'Active Sessions & Security',
        type: 'notifications',
        data: {
          activeDeviceCount: projection.security.activeDeviceCount,
          lastLoginAt: projection.security.lastLoginAt,
        },
      },
    ]
  }
}
