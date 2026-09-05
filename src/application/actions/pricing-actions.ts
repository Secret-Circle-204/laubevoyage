'use server'

import { getApplicationServices } from '@/application/factory'
import { SessionResolver } from '@/application/auth/session-resolver'
import type { ConvertedPrice } from '@/domains/currency/types'
import type { CommercialSnapshotBreakdown } from '@/domains/booking/types'
import type { FormattedCommercialBreakdown } from '@/application/experience/dto-details'

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
  children?: number
  childAges?: number[]
  childBeddingModes?: ('sharing_bed' | 'extra_bed')[]
  requestedRooms?: number
  currency: string
  locale?: string
  pointsToRedeem?: number
}): Promise<{
  success: boolean
  slotId?: number
  departureId?: string
  pricing?: {
    unitPrice: ConvertedPrice
    totalPrice: ConvertedPrice
    originalPrice?: ConvertedPrice
    loyaltyDiscountPrice?: ConvertedPrice
    estimatedEarnPoints?: number
    remainingLoyaltyPoints?: number
    commercialBreakdown?: CommercialSnapshotBreakdown
    formattedBreakdown?: FormattedCommercialBreakdown
  }
  error?: string
  code?: string
}> {
  try {
    // 1. Strict Transport Invariant Validation on Points Input
    if (params.pointsToRedeem !== undefined && params.pointsToRedeem !== null) {
      if (
        typeof params.pointsToRedeem !== 'number' ||
        !Number.isFinite(params.pointsToRedeem) ||
        !Number.isInteger(params.pointsToRedeem) ||
        params.pointsToRedeem < 0
      ) {
        return {
          success: false,
          error: 'Invalid loyalty points redemption amount. Points must be a non-negative integer.',
          code: 'INVALID_POINTS_INPUT',
        }
      }
    }

    // 2. Server Session Identity Resolution (Zero client trust)
    const session = await SessionResolver.resolve()
    const customerId = session.isAuthenticated && session.customerId ? session.customerId : undefined

    if (params.pointsToRedeem && params.pointsToRedeem > 0 && !customerId) {
      return {
        success: false,
        error: 'Authentication required. Please sign in to preview loyalty rewards.',
        code: 'UNAUTHENTICATED',
      }
    }

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
    const effectiveChildren = params.children ?? 0

    if (isFixedPackage) {
      if (!params.slotId) {
        return { success: false, error: 'slotId is required to resolve pricing for fixed package' }
      }
      const result = await bookingPricingUseCase.calculate({
        experienceId: params.experienceId,
        slotId: params.slotId,
        adultsCount: params.adults,
        childrenCount: effectiveChildren,
        childAges: params.childAges,
        childBeddingModes: params.childBeddingModes,
        requestedRooms: params.requestedRooms,
        ctx,
        pointsToRedeem: params.pointsToRedeem,
        customerId,
      })

      return {
        success: true,
        slotId: params.slotId,
        departureId: result.departure.departureId,
        pricing: {
          unitPrice: result.unitPrice,
          totalPrice: result.totalCost,
          originalPrice: result.originalPrice,
          loyaltyDiscountPrice: result.loyaltyDiscountPrice,
          estimatedEarnPoints: result.estimatedEarnPoints,
          remainingLoyaltyPoints: result.remainingLoyaltyPoints,
          commercialBreakdown: result.commercialBreakdown,
          formattedBreakdown: result.formattedBreakdown,
        },
      }
    } else if (isFlexiblePackage) {
      const today = new Date().toISOString().split('T')[0]
      const pricingDate = params.date || today
      const result = await bookingPricingUseCase.calculatePreview({
        experienceId: params.experienceId,
        date: pricingDate,
        startTime: '',
        adultsCount: params.adults,
        childrenCount: effectiveChildren,
        childAges: params.childAges,
        childBeddingModes: params.childBeddingModes,
        requestedRooms: params.requestedRooms,
        ctx,
        pointsToRedeem: params.pointsToRedeem,
        customerId,
      })

      return {
        success: true,
        slotId: undefined,
        departureId: result.departure.departureId,
        pricing: {
          unitPrice: result.unitPrice,
          totalPrice: result.totalCost,
          originalPrice: result.originalPrice,
          loyaltyDiscountPrice: result.loyaltyDiscountPrice,
          estimatedEarnPoints: result.estimatedEarnPoints,
          remainingLoyaltyPoints: result.remainingLoyaltyPoints,
          commercialBreakdown: result.commercialBreakdown,
          formattedBreakdown: result.formattedBreakdown,
        },
      }
    } else if (isDailyTour) {
      if (!params.date || !params.startTime) {
        return { success: false, error: 'date and startTime are required to resolve pricing for daily tour' }
      }
      const result = await bookingPricingUseCase.calculatePreview({
        experienceId: params.experienceId,
        date: params.date,
        startTime: params.startTime,
        adultsCount: params.adults,
        childrenCount: effectiveChildren,
        childAges: params.childAges,
        childBeddingModes: params.childBeddingModes,
        requestedRooms: params.requestedRooms,
        ctx,
        pointsToRedeem: params.pointsToRedeem,
        customerId,
      })

      return {
        success: true,
        slotId: undefined,
        departureId: result.departure.departureId,
        pricing: {
          unitPrice: result.unitPrice,
          totalPrice: result.totalCost,
          originalPrice: result.originalPrice,
          loyaltyDiscountPrice: result.loyaltyDiscountPrice,
          estimatedEarnPoints: result.estimatedEarnPoints,
          remainingLoyaltyPoints: result.remainingLoyaltyPoints,
          commercialBreakdown: result.commercialBreakdown,
          formattedBreakdown: result.formattedBreakdown,
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


