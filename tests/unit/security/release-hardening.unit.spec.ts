import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'

const { mockGetByBookingNumber, mockAuthenticateRequest } = vi.hoisted(() => ({
  mockGetByBookingNumber: vi.fn(),
  mockAuthenticateRequest: vi.fn(),
}))

vi.mock('@/application/auth/session-resolver', () => ({
  SessionResolver: {
    resolve: vi.fn().mockResolvedValue({
      isAuthenticated: true,
      customerId: 77,
      role: 'customer',
    }),
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}))

vi.mock('@/domains/factory', () => ({
  getDomainServices: vi.fn().mockResolvedValue({
    customer: {
      authenticateRequest: mockAuthenticateRequest,
    },
    booking: {
      getByBookingNumber: mockGetByBookingNumber,
      moveToPendingPayment: vi.fn(),
      getById: vi.fn(),
      cancel: vi.fn(),
      delete: vi.fn(),
    },
    experience: {
      getById: vi.fn(),
    },
    payment: {
      processPaymentCheckout: vi.fn(),
    },
    currency: {
      syncExchangeRates: vi.fn().mockResolvedValue({ success: true }),
    },
    localization: {
      buildContext: vi.fn().mockResolvedValue({ currency: 'EGP' }),
    },
    payload: {
      db: {
        beginTransaction: vi.fn(),
      },
    },
  }),
}))

describe('Security & Production Hardening Regression Guards (Batch 8)', () => {
  describe('F-PR-001: Strict Authentication & Tenant Isolation on DELETE /api/bookings', () => {
    it('should reject unauthenticated deletion with 401 Unauthorized', async () => {
      mockAuthenticateRequest.mockResolvedValueOnce(null)
      const { DELETE } = await import('@/app/api/bookings/route')

      const mockRequest = new NextRequest('http://localhost:3000/api/bookings?id=101', {
        method: 'DELETE',
      })

      const response = await DELETE(mockRequest)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('F-PR-002 & F-PR-003: Removal of Unauthenticated Legacy & Debug Endpoints', () => {
    it('should verify /api/loyalty/balance route is completely deleted', () => {
      const routePath = path.resolve(process.cwd(), 'src/app/api/loyalty/balance/route.ts')
      expect(fs.existsSync(routePath)).toBe(false)
    })

    it('should verify /api/loyalty/history route is completely deleted', () => {
      const routePath = path.resolve(process.cwd(), 'src/app/api/loyalty/history/route.ts')
      expect(fs.existsSync(routePath)).toBe(false)
    })

    it('should verify /api/internal/test-cookies route is completely deleted', () => {
      const routePath = path.resolve(process.cwd(), 'src/app/api/internal/test-cookies/route.ts')
      expect(fs.existsSync(routePath)).toBe(false)
    })
  })

  describe('F-PR-004: Tenant Scoping on Existing Booking Checkout Resume', () => {
    it('should enforce customerId ownership in confirmCheckoutAction when resuming booking', async () => {
      mockGetByBookingNumber.mockImplementation((bookingNumber: string, customerId?: number) => {
        // If query is strictly tenant-scoped to 77, looking up booking of Customer 88 returns null
        if (customerId === 77 && bookingNumber === 'LBV-OTHER-88') {
          return Promise.resolve(null)
        }
        return Promise.resolve({
          id: 88,
          bookingNumber: 'LBV-OTHER-88',
          customerId: 88,
          status: 'draft',
        })
      })

      const { confirmCheckoutAction } = await import('@/application/actions/booking-actions')

      const result = await confirmCheckoutAction({
        bookingId: 'LBV-OTHER-88',
        experienceId: 10,
        adults: 1,
        travelers: [{ firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '01000000000' }],
        gatewayId: 'stripe',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Booking not found or unauthorized')
      expect(mockGetByBookingNumber).toHaveBeenCalledWith('LBV-OTHER-88', 77)
    })
  })

  describe('F-PR-005: Fail-Closed CRON_SECRET Guard in /api/cron/exchange-rates', () => {
    const originalEnv = process.env.CRON_SECRET

    it('should reject request with 401 when CRON_SECRET is missing from environment', async () => {
      delete process.env.CRON_SECRET
      const { GET } = await import('@/app/api/cron/exchange-rates/route')

      const req = new NextRequest('http://localhost:3000/api/cron/exchange-rates', {
        headers: { authorization: 'Bearer some_secret' },
      })
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('should reject request with 401 when Bearer token is incorrect', async () => {
      process.env.CRON_SECRET = 'correct_super_secret'
      const { GET } = await import('@/app/api/cron/exchange-rates/route')

      const req = new NextRequest('http://localhost:3000/api/cron/exchange-rates', {
        headers: { authorization: 'Bearer wrong_token' },
      })
      const res = await GET(req)
      expect(res.status).toBe(401)
      process.env.CRON_SECRET = originalEnv
    })

    it('should allow execution with 200 when Bearer token matches CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'correct_super_secret'
      const { GET } = await import('@/app/api/cron/exchange-rates/route')

      const req = new NextRequest('http://localhost:3000/api/cron/exchange-rates', {
        headers: { authorization: 'Bearer correct_super_secret' },
      })
      const res = await GET(req)
      expect(res.status).toBe(200)
      process.env.CRON_SECRET = originalEnv
    })
  })
})
