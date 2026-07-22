import { describe, it, expect } from 'vitest'
import { FinancialReconciliationService } from '@/domains/maintenance/reconciliation'

describe('Maintenance Domain: Granular Financial Reconciliation Unit Tests', () => {
  it('should categorize discrepancy status as orphaned_gateway, orphaned_internal, or amount_mismatch', () => {
    const service = new FinancialReconciliationService()

    expect(service.categorizeDiscrepancy(null, { id: 'p_1' })).toBe('orphaned_gateway')
    expect(service.categorizeDiscrepancy({ id: 'p_1' }, null)).toBe('orphaned_internal')
    expect(service.categorizeDiscrepancy({ amount: 100 }, { amount: 120 })).toBe('amount_mismatch')
    expect(service.categorizeDiscrepancy({ amount: 100, currency: 'EGP' }, { amount: 100, currency: 'EGP' })).toBe('matched')
  })
})
