import { describe, it, expect } from 'vitest'
import { CustomerPolicy } from '@/domains/customer/policy'
import type { CustomerAggregate } from '@/domains/customer/aggregate'

describe('Customer Domain: CustomerPolicy Unit Tests', () => {
  const activeCustomer: CustomerAggregate = {
    customerId: 1,
    email: 'test@laube.com',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    fullName: 'Ahmed Hassan',
    isEmailVerified: true,
    isPhoneVerified: false,
    status: 'active',
    preferredCurrency: 'EGP',
    preferredLanguage: 'en',
    failedLoginAttempts: 0,
    version: 1,
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  }

  it('should allow booking for active customer', () => {
    const result = CustomerPolicy.canBook(activeCustomer)
    expect(result.allowed).toBe(true)
  })

  it('should disallow booking for suspended customer', () => {
    const suspendedCustomer: CustomerAggregate = { ...activeCustomer, status: 'suspended' }
    const result = CustomerPolicy.canBook(suspendedCustomer)
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('CUSTOMER_NOT_ACTIVE')
  })

  it('should allow welcome bonus only if email is verified', () => {
    expect(CustomerPolicy.canClaimWelcomeBonus(activeCustomer).allowed).toBe(true)
    const unverified: CustomerAggregate = { ...activeCustomer, isEmailVerified: false }
    expect(CustomerPolicy.canClaimWelcomeBonus(unverified).allowed).toBe(false)
  })
})
