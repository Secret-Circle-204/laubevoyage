import { describe, it, expect } from 'vitest'
import { BookingPricingSnapshotAssembler } from '@/domains/booking/pricing-snapshot-assembler'
import type { PricingCalculationResult } from '@/domains/currency/types'

describe('Booking Domain: PricingSnapshotAssembler Unit Tests', () => {
  it('should strictly assemble a PricingSnapshotData Aggregate Value Object from a PricingCalculationResult', () => {
    const assembler = new BookingPricingSnapshotAssembler()

    const calculation: PricingCalculationResult = {
      snapshotId: 'snap_test_123',
      snapshotVersion: 'v1',
      pricingRuleVersion: 'v1.0.0',
      exchangeRateVersion: 'v1.0.0',
      basePriceEGP: 1500,
      loyaltyDiscountEGP: 100,
      promotionDiscountEGP: 50,
      couponDiscountEGP: 0,
      subtotalEGP: 1350,
      taxes: 189,
      fees: 0,
      totalAmountEGP: 1539,
      displayCurrency: 'USD',
      displayAmount: 30.78,
      exchangeRate: 0.02,
      exchangeRateTimestamp: '2026-07-26T10:00:00.000Z',
      calculatedAt: '2026-07-26T10:00:00.000Z',
    }

    const snapshot = assembler.assemble(calculation)

    expect(snapshot.version).toBe(1)
    expect(snapshot.pricingVersion).toBe(1)
    expect(snapshot.basePriceEGP).toBe(1500)
    expect(snapshot.loyaltyDiscountEGP).toBe(100)
    expect(snapshot.promotionDiscountEGP).toBe(50)
    expect(snapshot.subtotalEGP).toBe(1350)
    expect(snapshot.taxes).toBe(189)
    expect(snapshot.fees).toBe(0)
    expect(snapshot.totalAmountEGP).toBe(1539)
    expect(snapshot.displayCurrency).toBe('USD')
    expect(snapshot.displayAmount).toBe(30.78)
    expect(snapshot.exchangeRate).toBe(0.02)
    expect(snapshot.exchangeRateTimestamp).toBe('2026-07-26T10:00:00.000Z')
  })
})
