import { describe, it, expect } from 'vitest'
import { DashboardDocumentsHub } from '@/domains/dashboard/documents-hub'

describe('Dashboard Domain: Documents Hub Unit Tests', () => {
  it('should return PDF vouchers, invoices, and e-ticket document links', () => {
    const docs = DashboardDocumentsHub.getCustomerDocuments('#LBV-555')

    expect(docs.length).toBe(3)
    expect(docs.some((d) => d.type === 'voucher')).toBe(true)
    expect(docs.some((d) => d.type === 'invoice')).toBe(true)
    expect(docs.some((d) => d.type === 'e_ticket')).toBe(true)
  })
})
