import { describe, it, expect } from 'vitest'
import { PricingRuleEngine } from '@/domains/experience/pricing-rules'
import { PromotionEngine } from '@/domains/experience/promotion-engine'
import { TaxEngine } from '@/domains/experience/tax-engine'
import type { PricingContext } from '@/domains/experience/types'

describe('Experience Domain: Pricing Rules, Promotion & Tax Engine Unit Tests', () => {
  const mockContext: PricingContext = {
    departureId: 'dep_101',
    experienceId: 1,
    displayCurrency: 'USD',
    travelers: { adults: 2, children: 1, seniors: 0 },
    bookingDate: '2026-08-03', // Monday
    residentStatus: false,
  }

  it('should calculate base passenger tier pricing correctly', () => {
    // Base: 2000 EGP. Adults: 2 x 2000 = 4000. Children: 1 x 1400 = 1400. Total = 5400.
    const result = PricingRuleEngine.evaluateRules(2000, mockContext)
    expect(result.subtotalEGP).toBe(5400)
    expect(result.auditSteps.length).toBeGreaterThanOrEqual(1)
  })

  it('should apply coupon discount in PromotionEngine', () => {
    const promoContext: PricingContext = { ...mockContext, couponCode: 'SUMMER10' }
    const result = PromotionEngine.evaluatePromotions(5000, promoContext)
    expect(result.discountAmountEGP).toBe(500)
    expect(result.couponId).toBe('SUMMER10')
  })

  it('should calculate VAT tax and tourism service fees in TaxEngine', () => {
    const result = TaxEngine.calculateTaxesAndFees(5000)
    expect(result.taxAmountEGP).toBe(700) // 14% VAT of 5000 = 700
    expect(result.feeAmountEGP).toBe(50) // Tourism fee = 50
  })
})
