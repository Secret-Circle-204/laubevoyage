import { describe, it, expect, vi } from 'vitest'
import { RegistrationService } from '@/domains/customer/identity/registration'
import { AuthenticationService } from '@/domains/customer/identity/authentication'
import { CustomerRepository } from '@/domains/customer/repositories/customer-repository'
import type { CustomerAggregate } from '@/domains/customer/aggregate'

describe('Customer Domain: Security & Preferences Unit Tests', () => {
  it('should pass mapped preferences input to repository.create', async () => {
    const mockRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    } as unknown as CustomerRepository

    const service = new RegistrationService(mockRepo)
    await service.registerCustomer(
      'test@laube.com',
      'Ahmed',
      'Hassan',
      'Pass123!',
      { preferredLanguage: 'ar', preferredCurrency: 'USD' }
    )

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@laube.com',
        preferences: {
          preferredLanguage: 'ar',
          preferredCurrency: 'USD',
          preferredLocale: 'ar-EG',
        },
      }),
      undefined,
      undefined
    )
  })

  it('should block authentication if lockedUntil is in the future', async () => {
    const lockedCustomer: CustomerAggregate = {
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
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // Locked for 10 mins
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(lockedCustomer),
    } as unknown as CustomerRepository

    const authService = new AuthenticationService(mockRepo)

    await expect(authService.onCustomerAuthenticated(1)).rejects.toThrow(
      'Account is temporarily locked. Please try again later.'
    )
  })

  it('should allow authentication and reset attempts if lockedUntil is in the past', async () => {
    const expiredLockCustomer: CustomerAggregate = {
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
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // Expired 10 mins ago
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(expiredLockCustomer),
      save: vi.fn().mockImplementation((updated) => Promise.resolve(updated)),
    } as unknown as CustomerRepository

    const authService = new AuthenticationService(mockRepo)
    const result = await authService.onCustomerAuthenticated(1)

    expect(result.failedLoginAttempts).toBe(0)
    expect(result.lockedUntil).toBeUndefined()
    expect(mockRepo.save).toHaveBeenCalled()
  })
})
