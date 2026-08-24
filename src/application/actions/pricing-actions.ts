'use server'

import { getApplicationServices } from '@/application/factory'
import type { ConvertedPrice } from '@/domains/currency/types'

/**
 * Server Action to resolve the pricing view model on the server.
 * Pure Read-Only Query (Zero DB Mutations).
 */
export async function resolvePricingAction(params: {
  experienceId: number
  slotId?: number
  date?: string
  startTime?: string
  adults: number
  currency: string
  locale?: string
}): Promise<{
  success: boolean
  slotId?: number
  departureId?: string
  pricing?: { unitPrice: ConvertedPrice; totalPrice: ConvertedPrice }
  error?: string
}> {
  try {
    const { bookingPricingUseCase, localization, experience } = await getApplicationServices()

    const ctx = await localization.buildContext({
      cookieLocale: params.locale,
      cookieCurrency: params.currency,
    })

    const expDoc = await experience.getById(params.experienceId)
    if (!expDoc) {
      return { success: false, error: 'Experience not found' }
    }

    const isFixedPackage = expDoc.type === 'package' && expDoc.packageMode === 'fixed_date'
    const isFlexiblePackage = expDoc.type === 'package' && expDoc.packageMode === 'flexible_date'
    const isDailyTour = expDoc.type === 'daily_tour'

    if (isFixedPackage) {
      if (!params.slotId) {
        return { success: false, error: 'slotId is required to resolve pricing for fixed package' }
      }
      const { totalCost, unitPrice, departure } = await bookingPricingUseCase.calculate({
        experienceId: params.experienceId,
        slotId: params.slotId,
        adultsCount: params.adults,
        childrenCount: 0,
        ctx,
      })

      return {
        success: true,
        slotId: params.slotId,
        departureId: departure.departureId,
        pricing: {
          unitPrice,
          totalPrice: totalCost,
        },
      }
    } else if (isFlexiblePackage) {
      // Flexible Package: Date-driven (no slotId, no startTime)
      const today = new Date().toISOString().split('T')[0]
      const pricingDate = params.date || today
      const { totalCost, unitPrice, departure } = await bookingPricingUseCase.calculatePreview({
        experienceId: params.experienceId,
        date: pricingDate,
        startTime: '',
        adultsCount: params.adults,
        childrenCount: 0,
        ctx,
      })

      return {
        success: true,
        slotId: undefined,
        departureId: departure.departureId,
        pricing: {
          unitPrice,
          totalPrice: totalCost,
        },
      }
    } else if (isDailyTour) {
      // Daily Tour: requires date and startTime
      if (!params.date || !params.startTime) {
        return { success: false, error: 'date and startTime are required to resolve pricing for daily tour' }
      }
      const { totalCost, unitPrice, departure } = await bookingPricingUseCase.calculatePreview({
        experienceId: params.experienceId,
        date: params.date,
        startTime: params.startTime,
        adultsCount: params.adults,
        childrenCount: 0,
        ctx,
      })

      return {
        success: true,
        slotId: undefined,
        departureId: departure.departureId,
        pricing: {
          unitPrice,
          totalPrice: totalCost,
        },
      }
    } else {
      return { success: false, error: 'Invalid experience type' }
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Pricing resolution failed',
    }
  }
}

