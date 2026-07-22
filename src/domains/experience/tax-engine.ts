import type { PricingAuditStep } from './types'

export interface TaxResult {
  taxAmountEGP: number
  feeAmountEGP: number
  auditSteps: PricingAuditStep[]
}

/**
 * Dedicated Tax Engine
 * Calculates applicable taxes (e.g. 14% VAT) and mandatory tourism service fees.
 */
export class TaxEngine {
  static calculateTaxesAndFees(subtotalEGP: number): TaxResult {
    const vatAmount = Math.round(subtotalEGP * 0.14) // 14% VAT
    const serviceFee = 50 // Fixed 50 EGP tourism service fee

    const auditSteps: PricingAuditStep[] = [
      {
        stepName: 'VAT_TAX',
        amountChangeEGP: vatAmount,
        reason: '14% Value Added Tax (VAT)',
        resultingSubtotalEGP: subtotalEGP + vatAmount,
      },
      {
        stepName: 'SERVICE_FEE',
        amountChangeEGP: serviceFee,
        reason: 'Tourism service & processing fee',
        resultingSubtotalEGP: subtotalEGP + vatAmount + serviceFee,
      },
    ]

    return {
      taxAmountEGP: vatAmount,
      feeAmountEGP: serviceFee,
      auditSteps,
    }
  }
}
