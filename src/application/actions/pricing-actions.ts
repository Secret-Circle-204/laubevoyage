'use server'

import { getApplicationServices } from '@/application/factory'
import type { ConvertedPrice } from '@/domains/currency/types'

/**
 * Server Action to resolve the pricing view model on the server.
 */
export async function resolvePricingAction(params: {
  experienceId: number
  slotId?: number
  adults: number
  currency: string
  locale?: string
}): Promise<{ success: boolean; pricing?: { unitPrice: ConvertedPrice; totalPrice: ConvertedPrice }; error?: string }> {
  try {
    const { bookingPricingUseCase, localization } = await getApplicationServices()

    const ctx = await localization.buildContext({
      cookieLocale: params.locale,
      cookieCurrency: params.currency,
    })

    const { totalCost, unitPrice } = await bookingPricingUseCase.calculate({
      experienceId: params.experienceId,
      slotId: params.slotId,
      adultsCount: params.adults,
      childrenCount: 0,
      ctx,
    })

    return {
      success: true,
      pricing: {
        unitPrice,
        totalPrice: totalCost,
      },
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Pricing resolution failed',
    }
  }
}
