import type { PricingContext, PricingAuditStep } from '../experience/types'
import { PricingRuleEngine } from '../experience/pricing-rules'
import { PromotionEngine } from '../experience/promotion-engine'
import { TaxEngine } from '../experience/tax-engine'
import { DefaultRateProvider, type IExchangeRateProvider } from './providers/rate-provider'

export interface PricingSnapshotData {
  snapshotId: string
  snapshotVersion: string
  pricingRuleVersion: string
  exchangeRateVersion: string
  basePriceEGP: number
  displayCurrency: string
  displayAmount: number
  exchangeRateUsed: number
  exchangeRateTimestamp: string
  taxesApplied: number
  feesApplied: number
  couponId?: string
  campaignId?: string
  auditTrace: PricingAuditStep[]
  calculatedAt: string
}

export type PricingResult = { snapshot: PricingSnapshotData }


/**
 * Pricing Pipeline Engine
 * Modular pricing pipeline executing:
 * Base Price (EGP) -> PricingRuleEngine -> PromotionEngine -> TaxEngine -> ExchangeRateProvider -> Versioned PricingSnapshotData
 */
export class PricingPipelineEngine {
  private rateProvider: IExchangeRateProvider

  constructor(rateProvider?: IExchangeRateProvider) {
    this.rateProvider = rateProvider || new DefaultRateProvider()
  }

  async calculatePricingSnapshot(
    basePriceEGP: number,
    context: PricingContext,
  ): Promise<PricingSnapshotData> {
    const auditTrace: PricingAuditStep[] = []

    // Step 1: Base Price
    auditTrace.push({
      stepName: 'BASE_CATALOG_PRICE',
      amountChangeEGP: basePriceEGP,
      reason: 'Base experience catalog departure price in EGP',
      resultingSubtotalEGP: basePriceEGP,
    })

    // Step 2: PricingRuleEngine (Passenger Tiers, Weekend Surge, Resident Discount)
    const ruleResult = PricingRuleEngine.evaluateRules(basePriceEGP, context)
    let currentSubtotalEGP = ruleResult.subtotalEGP
    auditTrace.push(...ruleResult.auditSteps)

    // Step 3: PromotionEngine (Coupons, Flash Sales)
    const promoResult = PromotionEngine.evaluatePromotions(currentSubtotalEGP, context)
    if (promoResult.discountAmountEGP > 0 && promoResult.auditStep) {
      currentSubtotalEGP -= promoResult.discountAmountEGP
      auditTrace.push(promoResult.auditStep)
    }

    // Step 4: TaxEngine (14% VAT & Tourism Fees)
    const taxResult = TaxEngine.calculateTaxesAndFees(currentSubtotalEGP)
    const finalAmountEGP = currentSubtotalEGP + taxResult.taxAmountEGP + taxResult.feeAmountEGP
    auditTrace.push(...taxResult.auditSteps)

    // Step 5: Multi-Currency Exchange Conversion
    const targetCurrency = context.displayCurrency.toUpperCase()
    const rate = await this.rateProvider.getExchangeRate('EGP', targetCurrency)
    const unroundedDisplay = finalAmountEGP * rate
    const displayAmount = Math.round(unroundedDisplay * 100) / 100 // Round to 2 decimals

    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    return {
      snapshotId,
      snapshotVersion: 'v1',
      pricingRuleVersion: 'v1.0.0',
      exchangeRateVersion: 'v1.0.0',
      basePriceEGP: finalAmountEGP,
      displayCurrency: targetCurrency,
      displayAmount,
      exchangeRateUsed: rate,
      exchangeRateTimestamp: new Date().toISOString(),
      taxesApplied: taxResult.taxAmountEGP,
      feesApplied: taxResult.feeAmountEGP,
      couponId: promoResult.couponId,
      campaignId: promoResult.campaignId,
      auditTrace,
      calculatedAt: new Date().toISOString(),
    }
  }

  async execute(params: {
    basePriceEGP: number
    loyaltyDiscount?: number
    targetCurrency?: string
  }): Promise<{ snapshot: PricingSnapshotData }> {
    const netBasePrice = Math.max(0, params.basePriceEGP - (params.loyaltyDiscount || 0))
    const context: PricingContext = {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: params.targetCurrency || 'EGP',
      travelers: { adults: 1 },
      bookingDate: new Date().toISOString(),
    }

    const snapshot = await this.calculatePricingSnapshot(netBasePrice, context)
    return { snapshot }
  }
}

export { PricingPipelineEngine as PricingPipeline }
