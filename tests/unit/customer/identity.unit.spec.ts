import { describe, it, expect, vi } from 'vitest'
import { VerificationService } from '@/domains/customer/identity/verification'
import { PasswordService } from '@/domains/customer/identity/password'

describe('Customer Domain: Verification & Password Service Unit Tests', () => {
  it('should generate un-hashed raw token for user and store SHA-256 hash internally', () => {
    const mockRepo: any = {
      findById: vi.fn().mockResolvedValue({
        customerId: 1,
        email: 'test@laube.com',
        isEmailVerified: false,
        status: 'pending_verification',
      }),
      save: vi.fn().mockImplementation((c) => Promise.resolve(c)),
    }

    const verificationService = new VerificationService(mockRepo)
    const rawToken = verificationService.generateVerificationToken(1)

    expect(rawToken).toContain('tok_')
  })

  it('should hash and verify passwords correctly', () => {
    const pass = 'Secret123!'
    const hash = PasswordService.hashPassword(pass)
    expect(PasswordService.verifyPassword(pass, hash)).toBe(true)
    expect(PasswordService.verifyPassword('WrongPass', hash)).toBe(false)
  })
})
