import { describe, it, expect } from 'vitest'
import { DashboardWidgetProvider } from '@/domains/dashboard/widget-provider'
import type { CustomerPortalProjection } from '@/domains/dashboard/types'

describe('Dashboard Domain: Widget Provider Unit Tests', () => {
  it('should build dynamic UI widgets from CustomerPortalProjection read model', () => {
    const mockProjection: CustomerPortalProjection = {
      projectionId: 'proj_1',
      customerId: 1,
      customer: { customerId: 1, email: 'a@b.com', fullName: 'A', isEmailVerified: true, status: 'active', preferredCurrency: 'EGP' },
      loyalty: { tier: 'elite', pointsBalance: 2000, activeHoldsCount: 0, totalSpentEGP: 100000, tierProgressPercentage: 100 },
      trips: { upcomingCount: 2, activeBookingsCount: 2, latestBookingNumber: '#LBV-999' },
      security: { activeDeviceCount: 1 },
      metrics: { cacheHit: true, aggregationDurationMs: 1, projectionVersion: 'v1', lastRefreshAt: '2026-07-22' },
      version: 1,
      updatedAt: '2026-07-22',
    }

    const widgets = DashboardWidgetProvider.buildWidgets(mockProjection)

    expect(widgets.length).toBe(3)
    expect(widgets[0].widgetId).toBe('widget_upcoming_trips')
    expect(widgets[1].widgetId).toBe('widget_loyalty_wallet')
  })
})
