import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomerPortalLoader, getSharedPortalOverview } from '@/application/dashboard/loaders'
import { CustomerLoyaltyLoader } from '@/application/loyalty/loaders'
import { LoyaltyProgressDTOFactory } from '@/application/loyalty/progress-factory'
import * as factory from '@/domains/factory'
import * as appFactory from '@/application/factory'

describe('Dashboard Read Pipeline & Deduplication Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    // Default mock for loyalty presentation builders
    vi.spyOn(LoyaltyProgressDTOFactory, 'build').mockResolvedValue({
      nextTierProgressPercent: 50,
      remainingQualifyingSpendEGP: 15000,
      formattedRemainingQualifyingSpend: '15,000 EGP',
      nextTierName: 'Platinum',
      progressText: '50% to Platinum',
    })

    vi.spyOn(LoyaltyProgressDTOFactory, 'buildValuation').mockResolvedValue({
      pointsMonetaryValue: { amount: 150, currency: 'USD', formatted: '$150' } as any,
      pointsValuesAllCurrencies: [],
      pointsValueGuide: { title: 'Points Guide', description: 'Value', unitText: 'pts' },
    })
  })

  const mockValidProjection = {
    projectionId: 'proj_123',
    customerId: 10,
    customer: {
      customerId: 10,
      email: 'traveler@example.com',
      fullName: 'Alexander Wright',
      isEmailVerified: true,
      status: 'active',
      preferredCurrency: 'USD',
    },
    loyalty: {
      tier: 'GOLD',
      pointsBalance: 15000,
      activeHoldsCount: 0,
      totalSpentEGP: 85000,
    },
    trips: {
      upcomingCount: 1,
      activeBookingsCount: 1,
    },
    security: { activeDeviceCount: 1 },
    metrics: { cacheHit: true, aggregationDurationMs: 1, projectionVersion: '1', lastRefreshAt: '' },
    version: 1,
    updatedAt: new Date().toISOString(),
  }

  it('1. loadSidebar retrieves fullName and tier from projection without calling customer.getById', async () => {
    const mockCustomerGetById = vi.fn()
    const mockGetPortalOverview = vi.fn().mockResolvedValue(mockValidProjection)
    const mockTranslateUiKey = vi.fn().mockImplementation((key: string) => key)
    const mockBuildContext = vi.fn().mockResolvedValue({})

    vi.spyOn(factory, 'getDomainServices').mockResolvedValue({
      customer: { getById: mockCustomerGetById } as any,
      dashboard: { getPortalOverview: mockGetPortalOverview } as any,
      localization: {
        buildContext: mockBuildContext,
        translateUiKey: mockTranslateUiKey,
      } as any,
    } as any)

    const sidebar = await CustomerPortalLoader.loadSidebar(10, 'en')

    expect(mockGetPortalOverview).toHaveBeenCalledWith(10)
    expect(mockCustomerGetById).not.toHaveBeenCalled() // Redundant query eliminated!

    expect(sidebar.customerId).toBe(10)
    expect(sidebar.fullName).toBe('Alexander Wright')
    expect(sidebar.currentTier).toBe('gold')
    expect(sidebar.navLinks.length).toBe(7)
  })

  it('2. loadSidebar provides safe deterministic defaults when projection fields are blank', async () => {
    const mockGetPortalOverview = vi.fn().mockResolvedValue({
      projectionId: 'proj_empty',
      customerId: 99,
      customer: {
        customerId: 99,
        email: '',
        fullName: '',
        isEmailVerified: false,
        status: 'active',
        preferredCurrency: 'EGP',
      },
      loyalty: {
        tier: '',
        pointsBalance: 0,
        activeHoldsCount: 0,
        totalSpentEGP: 0,
      },
      trips: { upcomingCount: 0, activeBookingsCount: 0 },
      security: { activeDeviceCount: 0 },
      metrics: { cacheHit: false, aggregationDurationMs: 1, projectionVersion: '1', lastRefreshAt: '' },
      version: 1,
      updatedAt: new Date().toISOString(),
    })

    vi.spyOn(factory, 'getDomainServices').mockResolvedValue({
      dashboard: { getPortalOverview: mockGetPortalOverview } as any,
      localization: {
        buildContext: vi.fn().mockResolvedValue({}),
        translateUiKey: vi.fn().mockImplementation((k: string) => k),
      } as any,
    } as any)

    const sidebar = await CustomerPortalLoader.loadSidebar(99)

    expect(sidebar.fullName).toBe('Traveler')
    expect(sidebar.currentTier).toBe('silver')
  })

  it('3. loadOverview preserves passportNumber and nationality from customerDoc', async () => {
    const mockCustomerGetById = vi.fn().mockResolvedValue({
      customerId: 10,
      email: 'alex@example.com',
      fullName: 'Alexander Wright',
      passportNumber: 'A12345678',
      nationality: 'British',
    })
    const mockGetPortalOverview = vi.fn().mockResolvedValue(mockValidProjection)

    vi.spyOn(factory, 'getDomainServices').mockResolvedValue({
      customer: { getById: mockCustomerGetById } as any,
      dashboard: { getPortalOverview: mockGetPortalOverview } as any,
      booking: { getUserBookings: vi.fn().mockResolvedValue({ data: [], total: 0 }) } as any,
      experience: { getManyByIds: vi.fn().mockResolvedValue([]) } as any,
      loyalty: {
        getActiveConfig: vi.fn().mockResolvedValue({
          tiers: [{ tier: 'silver', minSpentEGP: 0 }, { tier: 'gold', minSpentEGP: 50000 }],
          redemptionValueEGP: 1,
          redemptionPointsUnit: 100,
        }),
        getTierThresholds: vi.fn().mockReturnValue([]),
      } as any,
      currency: {} as any,
      pricingFacade: {} as any,
      localization: {
        buildContext: vi.fn().mockResolvedValue({}),
        translateBatch: vi.fn().mockResolvedValue([]),
        translateUiKey: vi.fn().mockImplementation((k: string) => k),
        formatPrice: vi.fn().mockResolvedValue({ formatted: '0 EGP' }),
        formatNumber: vi.fn().mockReturnValue('15,000'),
      } as any,
    } as any)

    // Mock loadNotifications
    vi.spyOn(CustomerPortalLoader, 'loadNotifications').mockResolvedValue({
      notifications: [],
      total: 0,
      page: 1,
      totalPages: 1,
      limit: 5,
    })

    const overview = await CustomerPortalLoader.loadOverview(10)

    expect(mockCustomerGetById).toHaveBeenCalledWith(10)
    expect(overview.passportNumber).toBe('A12345678')
    expect(overview.nationality).toBe('British')
    expect(overview.currentTier).toBe('gold')
    expect(overview.points).toBe(15000)
  })

  it('4. CustomerLoyaltyLoader uses getSharedPortalOverview for single-point projection retrieval', async () => {
    const mockGetPortalOverview = vi.fn().mockResolvedValue(mockValidProjection)

    // Mock getLocaleContext to prevent cookies() invocation outside Next.js request context
    const localeModule = await import('@/lib/get-locale-context')
    vi.spyOn(localeModule, 'getLocaleContext').mockResolvedValue({
      language: 'en',
      currency: 'USD',
      direction: 'ltr',
      isRTL: false,
    } as any)

    vi.spyOn(factory, 'getDomainServices').mockResolvedValue({
      dashboard: { getPortalOverview: mockGetPortalOverview } as any,
    } as any)

    vi.spyOn(appFactory, 'getApplicationServices').mockResolvedValue({
      loyalty: {
        getCustomerBalance: vi.fn().mockResolvedValue(15000),
        getCustomerLedgerHistoryPaginated: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        getActiveConfig: vi.fn().mockResolvedValue({
          tiers: [{ tier: 'silver', minSpentEGP: 0 }, { tier: 'gold', minSpentEGP: 50000 }],
          redemptionValueEGP: 1,
          redemptionPointsUnit: 100,
        }),
        getTierThresholds: vi.fn().mockReturnValue([]),
      } as any,
      booking: { getActiveHeldPointsForCustomer: vi.fn().mockResolvedValue(0) } as any,
      localization: {
        buildContext: vi.fn().mockResolvedValue({}),
        translateUiKey: vi.fn().mockReturnValue('Sovereign'),
        translateText: vi.fn().mockImplementation((t: string) => Promise.resolve(t)),
        formatPrice: vi.fn().mockResolvedValue({ formatted: '$150' }),
        formatNumber: vi.fn().mockReturnValue('15,000'),
      } as any,
      currency: {} as any,
      pricingFacade: {} as any,
    } as any)

    const loyaltyData = await CustomerLoyaltyLoader.load(10)

    expect(loyaltyData.pointsBalance).toBe(15000)
    expect(loyaltyData.currentTier).toBe('gold')
    expect(mockGetPortalOverview).toHaveBeenCalledWith(10)
  })

  it('5. getSharedPortalOverview memoizes and executes underlying query exactly once for duplicate calls in same request', async () => {
    let executionCount = 0
    const mockGetPortalOverview = vi.fn().mockImplementation(async (id: number) => {
      executionCount++
      return { ...mockValidProjection, customerId: id }
    })

    vi.spyOn(factory, 'getDomainServices').mockResolvedValue({
      dashboard: { getPortalOverview: mockGetPortalOverview } as any,
    } as any)

    // Parallel calls with same customerId
    const [res1, res2, res3] = await Promise.all([
      getSharedPortalOverview(42),
      getSharedPortalOverview(42),
      getSharedPortalOverview(42),
    ])

    expect(res1).toStrictEqual(res2)
    expect(res2).toStrictEqual(res3)
    expect(res1.customerId).toBe(42)
  })
})
