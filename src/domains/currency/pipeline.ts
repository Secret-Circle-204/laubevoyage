import { DefaultRateProvider, type IExchangeRateProvider } from './providers/rate-provider'

export interface PricingContext {
  departureId: string
  experienceId: number
  displayCurrency: string
  travelers: { adults: number; children?: number; infants?: number }
  bookingDate: string
  promoCode?: string
  isResident?: boolean
}

export interface PricingAuditStep {
  stepName: string
  amountChangeEGP: number
  reason: string
  resultingSubtotalEGP: number
}

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
 * Multi-Currency Exchange Conversion & Financial Pricing Snapshot Pipeline.
 * Decoupled from specific domain calculation engines via constructor handlers.
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

    auditTrace.push({
      stepName: 'BASE_CATALOG_PRICE',
      amountChangeEGP: basePriceEGP,
      reason: 'Base catalog price in EGP',
      resultingSubtotalEGP: basePriceEGP,
    })

    const vatRate = 0.14
    const taxAmountEGP = Math.round(basePriceEGP * vatRate * 100) / 100
    const finalAmountEGP = basePriceEGP + taxAmountEGP

    auditTrace.push({
      stepName: 'TAX_VAT_14',
      amountChangeEGP: taxAmountEGP,
      reason: '14% Standard VAT Applied',
      resultingSubtotalEGP: finalAmountEGP,
    })

    const targetCurrency = (context.displayCurrency || 'EGP').toUpperCase()
    const rate = await this.rateProvider.getExchangeRate('EGP', targetCurrency)
    const unroundedDisplay = finalAmountEGP * rate
    const displayAmount = Math.round(unroundedDisplay * 100) / 100

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
      taxesApplied: taxAmountEGP,
      feesApplied: 0,
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
