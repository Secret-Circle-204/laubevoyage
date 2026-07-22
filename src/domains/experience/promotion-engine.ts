import type { PricingContext, PricingAuditStep } from './types'

export interface PromotionResult {
  discountAmountEGP: number
  couponId?: string
  campaignId?: string
  auditStep?: PricingAuditStep
}

/**
 * Dedicated Promotion Engine
 * Handles promotional discounts, coupon validation, and flash sales.
 */
export class PromotionEngine {
  static evaluatePromotions(currentSubtotalEGP: number, context: PricingContext): PromotionResult {
    if (!context.couponCode) {
      return { discountAmountEGP: 0 }
    }

    const code = context.couponCode.toUpperCase()

    // Example promo coupon rule: 'SUMMER10' gives 10% discount
    if (code === 'SUMMER10' || code === 'LAUBE10') {
      const discount = Math.round(currentSubtotalEGP * 0.1)
      const resulting = currentSubtotalEGP - discount
      return {
        discountAmountEGP: discount,
        couponId: code,
        campaignId: 'SUMMER_PROMO_2026',
        auditStep: {
          stepName: 'PROMOTION_DISCOUNT',
          amountChangeEGP: -discount,
          reason: `Coupon code '${code}' applied (-10%)`,
          resultingSubtotalEGP: resulting,
        },
      }
    }

    return { discountAmountEGP: 0 }
  }
}
