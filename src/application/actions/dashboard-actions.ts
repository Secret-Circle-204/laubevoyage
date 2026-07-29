'use server'

import { getDomainServices } from '@/domains/factory'
import type { LocaleContext } from '@/types/locale'

export async function getDashboardOverviewAction(
  customerId: number,
  localeContext?: Partial<LocaleContext>,
) {
  try {
    if (!customerId) {
      return { success: false, error: 'Customer ID is required' }
    }

    const { dashboard, localization, currency } = await getDomainServices()
    const ctx = await localization.buildContext(localeContext)

    // 1. Fetch Raw Domain Projection
    const rawProjection = await dashboard.getPortalOverview(customerId)

    // 2. Format Points Value in Target Currency via Localization Presentation Gateway
    const formattedPointsValue = await currency.pointsToCurrency(
      rawProjection.loyalty.pointsBalance,
      ctx.currency,
    )

    const formattedPointsPrice = await localization.formatPrice(
      formattedPointsValue,
      ctx,
    )

    const formattedTotalSpent = await localization.formatPrice(
      rawProjection.loyalty.totalSpentEGP,
      ctx,
    )

    return {
      success: true,
      data: {
        ...rawProjection,
        formattedLoyaltyValue: formattedPointsPrice.formatted,
        formattedTotalSpent: formattedTotalSpent.formatted,
      },
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard overview',
    }
  }
}
