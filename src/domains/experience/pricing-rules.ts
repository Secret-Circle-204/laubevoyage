import type { PricingContext, PricingAuditStep } from './types'

export interface PricingRuleResult {
  subtotalEGP: number
  auditSteps: PricingAuditStep[]
}

/**
 * Dedicated Pricing Rule Engine
 * Single source of truth for base pricing modifications (passenger tiers, weekend surge, resident discounts).
 */
export class PricingRuleEngine {
  static evaluateRules(basePriceEGP: number, context: PricingContext): PricingRuleResult {
    const auditSteps: PricingAuditStep[] = []
    let currentSubtotal = 0

    // 1. Calculate Passenger Tiers (Adults 1.0x, Children 0.7x, Seniors 0.85x)
    const adults = Math.max(1, context.travelers.adults)
    const children = Math.max(0, context.travelers.children || 0)
    const seniors = Math.max(0, context.travelers.seniors || 0)

    const adultTotal = basePriceEGP * adults
    const childTotal = Math.round(basePriceEGP * 0.7) * children
    const seniorTotal = Math.round(basePriceEGP * 0.85) * seniors

    currentSubtotal = adultTotal + childTotal + seniorTotal

    auditSteps.push({
      stepName: 'BASE_PASSENGER_TIERS',
      amountChangeEGP: currentSubtotal,
      reason: `Adults: ${adults} x ${basePriceEGP}, Children: ${children} x 70%, Seniors: ${seniors} x 85%`,
      resultingSubtotalEGP: currentSubtotal,
    })

    // 2. Weekend Surge Pricing (10% surge on Friday and Saturday departures)
    const departureDate = new Date(context.bookingDate)
    const dayOfWeek = departureDate.getDay() // 0 = Sun, 5 = Fri, 6 = Sat
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      const surgeAmount = Math.round(currentSubtotal * 0.1)
      currentSubtotal += surgeAmount
      auditSteps.push({
        stepName: 'WEEKEND_SURGE',
        amountChangeEGP: surgeAmount,
        reason: 'Weekend departure surge (+10%)',
        resultingSubtotalEGP: currentSubtotal,
      })
    }

    // 3. Resident Discount (15% discount for local residents)
    if (context.residentStatus) {
      const discountAmount = Math.round(currentSubtotal * 0.15)
      currentSubtotal -= discountAmount
      auditSteps.push({
        stepName: 'RESIDENT_DISCOUNT',
        amountChangeEGP: -discountAmount,
        reason: 'Local resident discount (-15%)',
        resultingSubtotalEGP: currentSubtotal,
      })
    }

    return { subtotalEGP: currentSubtotal, auditSteps }
  }
}
