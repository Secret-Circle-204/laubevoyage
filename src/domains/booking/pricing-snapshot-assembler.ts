import type { PricingCalculationResult } from '../currency/types'
import type { PricingSnapshotData } from './types'

/**
 * BookingPricingSnapshotAssembler
 * Pure Domain Assembler responsible for transforming strict Currency PricingCalculationResults
 * into frozen, immutable Booking Aggregate PricingSnapshotData Value Objects.
 */
export class BookingPricingSnapshotAssembler {
  assemble(calculation: PricingCalculationResult): PricingSnapshotData {
    return {
      version: 1,
      pricingVersion: 1,
      basePriceEGP: calculation.basePriceEGP,
      promotionDiscountEGP: calculation.promotionDiscountEGP,
      couponDiscountEGP: calculation.couponDiscountEGP,
      loyaltyDiscountEGP: calculation.loyaltyDiscountEGP,
      subtotalEGP: calculation.subtotalEGP,
      taxes: calculation.taxes,
      fees: calculation.fees,
      totalAmountEGP: calculation.totalAmountEGP,
      displayCurrency: calculation.displayCurrency,
      displayAmount: calculation.displayAmount,
      exchangeRate: calculation.exchangeRate,
      exchangeRateTimestamp: calculation.exchangeRateTimestamp,
    }
  }
}
