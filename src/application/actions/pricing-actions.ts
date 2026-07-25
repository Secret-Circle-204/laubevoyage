'use server'

import { getDomainServices } from '@/domains/factory'
import { Language } from '@/types/locale'
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
    const { bookingPricingUseCase, localization } = await getDomainServices()

    const language = Object.values(Language).includes(params.locale as Language)
      ? (params.locale as Language)
      : Language.EN

    const ctx = localization.buildContext({
      language,
      currency: params.currency,
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
