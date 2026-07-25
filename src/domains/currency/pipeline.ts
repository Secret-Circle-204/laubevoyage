import { DefaultRateProvider, type IExchangeRateProvider } from './providers/rate-provider'

export interface IPricingSettingsProvider {
  getSettings(): Promise<{
    vatRate: number
    vatEnabled: boolean
    pricesIncludeVat: boolean
  }>
}

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
  loyaltyDiscountEGP: number
  promotionDiscountEGP: number
  couponDiscountEGP: number
  subtotalEGP: number
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
  private settingsProvider: IPricingSettingsProvider

  constructor(rateProvider?: IExchangeRateProvider, settingsProvider?: IPricingSettingsProvider) {
    this.rateProvider = rateProvider || new DefaultRateProvider()
    this.settingsProvider = settingsProvider || {
      getSettings: async () => ({
        vatRate: 0.0,
        vatEnabled: false,
        pricesIncludeVat: false,
      })
    }
  }

  async calculatePricingSnapshot(
    basePriceEGP: number,
    context: PricingContext,
    discounts: { loyalty?: number; promotion?: number; coupon?: number } = {},
  ): Promise<PricingSnapshotData> {
    const auditTrace: PricingAuditStep[] = []

    auditTrace.push({
      stepName: 'BASE_CATALOG_PRICE',
      amountChangeEGP: basePriceEGP,
      reason: 'Base catalog price in EGP',
      resultingSubtotalEGP: basePriceEGP,
    })

    // 1. Enforce Sequence: Base Price -> Discounts
    const loyaltyDiscount = discounts.loyalty || 0
    const promotionDiscount = discounts.promotion || 0
    const couponDiscount = discounts.coupon || 0
    const totalDiscount = loyaltyDiscount + promotionDiscount + couponDiscount
    const netBasePrice = Math.max(0, basePriceEGP - totalDiscount)

    if (totalDiscount > 0) {
      auditTrace.push({
        stepName: 'DISCOUNTS_APPLIED',
        amountChangeEGP: -totalDiscount,
        reason: `Loyalty: ${loyaltyDiscount} EGP, Promotion: ${promotionDiscount} EGP, Coupon: ${couponDiscount} EGP`,
        resultingSubtotalEGP: netBasePrice,
      })
    }

    // 2. Enforce Sequence: VAT
    const settings = await this.settingsProvider.getSettings()
    let taxAmountEGP = 0
    let finalAmountEGP = netBasePrice
    const vatRate = settings.vatRate
    const vatEnabled = settings.vatEnabled
    const pricesIncludeVat = settings.pricesIncludeVat

    if (vatEnabled && vatRate > 0) {
      if (pricesIncludeVat) {
        // VAT is already included in the price.
        // Formula: Tax = Price - (Price / (1 + Rate))
        const netBaseWithoutVat = netBasePrice / (1 + vatRate)
        taxAmountEGP = Math.round((netBasePrice - netBaseWithoutVat) * 100) / 100
        // finalAmountEGP remains netBasePrice since VAT is already included
      } else {
        // VAT is not included, add it on top
        taxAmountEGP = Math.round(netBasePrice * vatRate * 100) / 100
        finalAmountEGP = netBasePrice + taxAmountEGP
      }

      auditTrace.push({
        stepName: `TAX_VAT_${Math.round(vatRate * 100)}`,
        amountChangeEGP: pricesIncludeVat ? 0 : taxAmountEGP,
        reason: pricesIncludeVat
          ? `${Math.round(vatRate * 100)}% VAT Included in Price (${taxAmountEGP} EGP)`
          : `${Math.round(vatRate * 100)}% Standard VAT Applied on Net Price`,
        resultingSubtotalEGP: finalAmountEGP,
      })
    } else {
      auditTrace.push({
        stepName: 'TAX_VAT_DISABLED',
        amountChangeEGP: 0,
        reason: 'VAT is disabled',
        resultingSubtotalEGP: finalAmountEGP,
      })
    }

    // 3. Enforce Sequence: Conversion
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
      basePriceEGP,
      loyaltyDiscountEGP: loyaltyDiscount,
      promotionDiscountEGP: promotionDiscount,
      couponDiscountEGP: couponDiscount,
      subtotalEGP: finalAmountEGP,
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
    promotionDiscount?: number
    couponDiscount?: number
    targetCurrency?: string
  }): Promise<{ snapshot: PricingSnapshotData }> {
    const context: PricingContext = {
      departureId: 'dep_101',
      experienceId: 1,
      displayCurrency: params.targetCurrency || 'EGP',
      travelers: { adults: 1 },
      bookingDate: new Date().toISOString(),
    }

    const snapshot = await this.calculatePricingSnapshot(params.basePriceEGP, context, {
      loyalty: params.loyaltyDiscount,
      promotion: params.promotionDiscount,
      coupon: params.couponDiscount,
    })
    return { snapshot }
  }
}

export { PricingPipelineEngine as PricingPipeline }
