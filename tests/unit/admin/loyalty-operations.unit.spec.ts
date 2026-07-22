import { describe, it, expect } from 'vitest'
import { AdminLoyaltyOperations } from '@/domains/admin/loyalty-operations'

describe('Admin Domain: Loyalty Operations Unit Tests', () => {
  it('should throw error if audit reason is missing when adjusting points', async () => {
    const ops = new AdminLoyaltyOperations({} as any)

    await expect(ops.adjustCustomerPointsByStaff(1, 500, '')).rejects.toThrow(
      'Mandatory audit reason required for staff points adjustment',
    )
  })
})
