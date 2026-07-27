import { describe, it, expect, vi } from 'vitest'
import { VerificationService } from '@/domains/customer/identity/verification'
import { PasswordService } from '@/domains/customer/identity/password'
import { CustomerRepository } from '@/domains/customer/repositories/customer-repository'

describe('Customer Domain: Verification & Password Service Unit Tests', () => {
  it('should delegate email verification to repository', async () => {
    const mockRepo = {
      verifyEmailByToken: vi.fn().mockResolvedValue(1),
    } as unknown as CustomerRepository

    const verificationService = new VerificationService(mockRepo)
    const result = await verificationService.verifyEmailToken('some-token')

    expect(mockRepo.verifyEmailByToken).toHaveBeenCalledWith('some-token')
    expect(result).toBe(1)
  })

  it('should hash and verify passwords correctly', () => {
    const pass = 'Secret123!'
    const hash = PasswordService.hashPassword(pass)
    expect(PasswordService.verifyPassword(pass, hash)).toBe(true)
    expect(PasswordService.verifyPassword('WrongPass', hash)).toBe(false)
  })
})
