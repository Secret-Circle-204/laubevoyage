import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirmCheckoutAction } from '@/application/actions/booking-actions'
import { SessionResolver } from '@/application/auth/session-resolver'

vi.mock('@/application/auth/session-resolver', () => ({
  SessionResolver: {
    resolve: vi.fn(),
  },
}))

vi.mock('@/domains/factory', () => ({
  getDomainServices: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
  headers: vi.fn().mockResolvedValue(new Map()),
}))

describe('Security Boundary: Customer vs Staff Isolation in Booking Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should explicitly reject staff/admin accounts attempting customer checkout', async () => {
    // Admin user authenticated in Payload 'users' collection
    vi.mocked(SessionResolver.resolve).mockResolvedValueOnce({
      isAuthenticated: true,
      role: 'admin',
      userId: 1,
      customerId: undefined,
      email: 'admin@laubevoyage.com',
    })

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      date: '2026-10-15',
      adults: 2,
      travelers: [
        {
          type: 'adult',
          firstName: 'Admin',
          lastName: 'Staff',
          email: 'admin@laubevoyage.com',
          phone: '+20100000000',
        },
      ],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_test_admin_rejection',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(
      'Staff accounts cannot create customer reservations. Please sign in with a traveler account.'
    )
  })

  it('should reject unauthenticated visitors attempting checkout', async () => {
    vi.mocked(SessionResolver.resolve).mockResolvedValueOnce({
      isAuthenticated: false,
    })

    const result = await confirmCheckoutAction({
      bookingId: 'new',
      experienceId: 693,
      date: '2026-10-15',
      adults: 2,
      travelers: [],
      gatewayId: 'stripe',
      idempotencyKey: 'idem_test_unauth',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Authentication required. Please sign in to check out.')
  })
})
