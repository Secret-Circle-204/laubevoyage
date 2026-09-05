import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('payload', () => ({
  getPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({
  default: {},
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}))

vi.mock('@/domains/factory', () => ({
  getDomainServices: vi.fn(),
}))

describe('Admin Currency Sync Action & UX Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('MUST reject unauthenticated or non-admin users with UNAUTHORIZED', async () => {
    const { getPayload } = await import('payload')
    const { syncExchangeRatesAdminAction } = await import('@/application/actions/currency-admin-actions')

    const mockPayload = {
      auth: vi.fn().mockResolvedValue({ user: null }),
    }
    ;(getPayload as any).mockResolvedValue(mockPayload)

    const result = await syncExchangeRatesAdminAction()

    expect(result.success).toBe(false)
    expect(result.code).toBe('UNAUTHORIZED')
  })

  it('MUST reject regular customer users with UNAUTHORIZED', async () => {
    const { getPayload } = await import('payload')
    const { syncExchangeRatesAdminAction } = await import('@/application/actions/currency-admin-actions')

    const mockPayload = {
      auth: vi.fn().mockResolvedValue({ user: { id: 123, role: 'customer' } }),
    }
    ;(getPayload as any).mockResolvedValue(mockPayload)

    const result = await syncExchangeRatesAdminAction()

    expect(result.success).toBe(false)
    expect(result.code).toBe('UNAUTHORIZED')
  })

  it('MUST trigger maintenance.triggerJob with manual_admin for authorized administrator', async () => {
    const { getPayload } = await import('payload')
    const { getDomainServices } = await import('@/domains/factory')
    const { syncExchangeRatesAdminAction } = await import('@/application/actions/currency-admin-actions')

    const mockPayload = {
      auth: vi.fn().mockResolvedValue({ user: { id: 42, role: 'admin' } }),
    }
    ;(getPayload as any).mockResolvedValue(mockPayload)

    const triggerJobMock = vi.fn().mockResolvedValue({ success: true, itemsProcessed: 1 })
    ;(getDomainServices as any).mockResolvedValue({
      maintenance: {
        triggerJob: triggerJobMock,
      },
    })

    const result = await syncExchangeRatesAdminAction()

    expect(result.success).toBe(true)
    expect(triggerJobMock).toHaveBeenCalledWith('currency_rate_refresh', 'manual_admin', 'admin_42')
  })

  it('MUST surface lease collision as JOB_LEASE_LOCKED without crashing', async () => {
    const { getPayload } = await import('payload')
    const { getDomainServices } = await import('@/domains/factory')
    const { syncExchangeRatesAdminAction } = await import('@/application/actions/currency-admin-actions')

    const mockPayload = {
      auth: vi.fn().mockResolvedValue({ user: { id: 99, role: 'super_admin' } }),
    }
    ;(getPayload as any).mockResolvedValue(mockPayload)

    const triggerJobMock = vi.fn().mockResolvedValue({ success: false, itemsProcessed: 0 })
    ;(getDomainServices as any).mockResolvedValue({
      maintenance: {
        triggerJob: triggerJobMock,
      },
    })

    const result = await syncExchangeRatesAdminAction()

    expect(result.success).toBe(false)
    expect(result.code).toBe('JOB_LEASE_LOCKED')
    expect(result.message).toContain('currently in progress')
  })
})
