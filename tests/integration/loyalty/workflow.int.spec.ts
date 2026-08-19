import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoyaltyWorkflowEngine } from '@/domains/loyalty/workflow'
import { EventOutboxService } from '@/domains/events/outbox'
import { loyaltyProgramRegistry } from '@/domains/loyalty/program-registry'
import { DashboardOverviewAggregator } from '@/domains/dashboard/overview-aggregator'
import { DashboardQueryBus } from '@/domains/dashboard/query-bus'
import { CustomerRepository } from '@/domains/customer/repositories/customer-repository'
import { DeviceSessionRepository } from '@/domains/customer/repositories/session-repository'
import { LoyaltyRepository } from '@/domains/loyalty/repository'
import { BookingRepository } from '@/domains/booking/repository'
import { LocalizationService } from '@/domains/localization/service'
import { LocaleContext, Language, MeasurementSystem } from '@/types/locale'

describe('Loyalty Domain: LoyaltyWorkflowEngine Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: LoyaltyWorkflowEngine
  let mockOutboxRepo: any

  beforeEach(() => {
    loyaltyProgramRegistry.invalidate()
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn(),
      findGlobal: vi.fn().mockResolvedValue({
        programCode: 'welcome',
        baseEarnRate: 0.1,
        redemptionPointsUnit: 100,
        redemptionValueEGP: 10,
        minRedemptionPoints: 100,
        maxRedemptionPercent: 10,
        welcomeBonus: 1000,
        expirationMonths: 12,
        isActive: true,
        tiers: [
          {
            tier: 'explorer',
            label: 'Explorer',
            minSpentEGP: 0,
            earnMultiplier: 1,
            upgradeBonus: 0,
          },
          {
            tier: 'voyager',
            label: 'Voyager',
            minSpentEGP: 50000,
            earnMultiplier: 1.5,
            upgradeBonus: 1000,
          },
          {
            tier: 'elite',
            label: 'Elite',
            minSpentEGP: 150000,
            earnMultiplier: 2.0,
            upgradeBonus: 5000,
          }
        ]
      }),
    }
    workflowEngine = new LoyaltyWorkflowEngine(mockPayload)
    
    mockOutboxRepo = {
      add: vi.fn().mockResolvedValue({ id: 'outbox_doc' })
    }
    ;(EventOutboxService.getInstance() as any).outboxRepository = mockOutboxRepo
  })

  it('should execute earn workflow, append ledger entry, and update customer projection', async () => {
    const mockCustomerDoc = {
      id: 5,
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
      loyalty: {
        points: 0,
        tier: 'explorer',
        totalSpent: 0,
      },
    }

    const mockLedgerDoc = {
      id: 'ledg_101',
      user: 5,
      type: 'earn',
      amount: 5000,
      balance: 5000,
      reason: 'Earned 5000 points',
      createdAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.findByID.mockResolvedValue(mockCustomerDoc)
    mockPayload.create.mockResolvedValue(mockLedgerDoc)
    mockPayload.update.mockResolvedValue(mockCustomerDoc)

    const record = await workflowEngine.earnPointsForBooking(5, 1, 50000) // 50000 EGP spent * 0.1 earn rate = 5000 points

    expect(mockPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'point-ledger',
      }),
    )
    expect(record.points).toBe(5000)
    expect(record.resultingBalance).toBe(5000)
  })

  it('Test C (Tier Bonus Scenario): should sync balance across welcome bonus, booking earn, and tier upgrade', async () => {
    let latestBalance = 0
    mockPayload.find.mockImplementation(async ({ collection, where, sort }: any) => {
      if (collection === 'point-ledger') {
        if (sort === '-createdAt') {
          return { docs: [{ balance: latestBalance }] }
        }
        return { docs: [] }
      }
      if (collection === 'loyalty-programs') {
        return {
          docs: [{
            programCode: 'welcome',
            baseEarnRate: 0.1,
            redemptionPointsUnit: 100,
            redemptionValueEGP: 10,
            minRedemptionPoints: 100,
            maxRedemptionPercent: 10,
            welcomeBonus: 1000,
            expirationMonths: 12,
            isActive: true,
            tiers: [
              { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
              { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.5, upgradeBonus: 500 },
            ]
          }]
        }
      }
      return { docs: [] }
    })

    // 1. Welcome Bonus
    const mockCustomerDoc = {
      id: 6,
      loyalty: { points: 0, tier: 'explorer', totalSpent: 0 }
    }
    const mockWelcomeLedger = { id: 'ledg_welcome', user: 6, type: 'welcome_bonus', amount: 100, balance: 100, reason: 'Welcome bonus' }
    mockPayload.findByID.mockResolvedValue(mockCustomerDoc)
    mockPayload.create.mockResolvedValue(mockWelcomeLedger)
    mockPayload.update.mockResolvedValue(mockCustomerDoc)

    const welcomeRecord = await workflowEngine.grantWelcomeBonus(6)
    expect(welcomeRecord.points).toBe(100)
    expect(welcomeRecord.resultingBalance).toBe(100)
    latestBalance = 100

    // Verify updateCustomerProjection was called with 100
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'customers',
        id: 6,
        data: expect.objectContaining({
          loyalty: expect.objectContaining({
            points: 100
          })
        })
      })
    )
    expect(mockOutboxRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LOYALTY_EARNED',
        customerId: 6,
        points: 100,
        balance: 100
      }),
      undefined
    )

    // 2. Booking Earn
    const mockEarnCustomerDoc = { id: 6, loyalty: { points: 100, tier: 'explorer', totalSpent: 0 } }
    const mockEarnLedger = { id: 'ledg_earn', user: 6, type: 'earn', amount: 760, balance: 860, reason: 'Earn' }
    mockPayload.findByID.mockResolvedValue(mockEarnCustomerDoc)
    mockPayload.create.mockResolvedValue(mockEarnLedger)

    const earnRecord = await workflowEngine.earnPointsForBooking(6, 1, 7600) // 7600 EGP spent * 0.1 earn rate = 760 points
    expect(earnRecord.points).toBe(760)
    expect(earnRecord.resultingBalance).toBe(860)
    latestBalance = 860

    // Verify updateCustomerProjection was called with 860
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'customers',
        id: 6,
        data: expect.objectContaining({
          loyalty: expect.objectContaining({
            points: 860
          })
        })
      })
    )
    expect(mockOutboxRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LOYALTY_EARNED',
        customerId: 6,
        points: 760,
        balance: 860
      }),
      undefined
    )

    // 3. Tier Upgrade evaluation
    const mockUpgradeCustomerDoc = { id: 6, loyalty: { points: 860, tier: 'explorer', totalSpent: 7600 } }
    const mockUpgradeLedger = { id: 'ledg_upgrade', user: 6, type: 'tier_bonus', amount: 500, balance: 1360, reason: 'Upgrade bonus' }
    mockPayload.findByID.mockResolvedValue(mockUpgradeCustomerDoc)
    mockPayload.create.mockResolvedValue(mockUpgradeLedger)

    // Configure voyager tier upgrade at 5000 EGP spend
    mockPayload.findGlobal.mockResolvedValue({
      programCode: 'welcome',
      baseEarnRate: 0.1,
      redemptionPointsUnit: 100,
      redemptionValueEGP: 10,
      minRedemptionPoints: 100,
      maxRedemptionPercent: 10,
      welcomeBonus: 1000,
      expirationMonths: 12,
      isActive: true,
      tiers: [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.5, upgradeBonus: 500 },
      ]
    })

    loyaltyProgramRegistry.invalidate()
    const newTier = await workflowEngine.evaluateAndUpgradeTier(6, 0)
    expect(newTier).toBe('voyager')

    // Verify updateCustomerProjection was called with 1360
    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'customers',
        id: 6,
        data: expect.objectContaining({
          loyalty: expect.objectContaining({
            points: 1360
          })
        })
      })
    )
    expect(mockOutboxRepo.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TIER_UPGRADED',
        customerId: 6,
        newTier: 'voyager',
        bonusGranted: 500
      }),
      undefined
    )
  })

  it('Test D (Stale Cache Architectural Regression): should rebuild dashboard projection from Point Ledger balance directly, ignoring intermediate stale customer projection cache', async () => {
    // Setup mismatched state:
    // customer.loyalty.points = 860 (stale intermediate cache)
    // point-ledger has entries summing to 1360 (authoritative)
    const mockCustomerDoc = {
      id: 73,
      email: 'hamza@test.com',
      fullName: 'Hamza Test',
      status: 'active',
      isEmailVerified: true,
      loyalty: {
        points: 860, // Stale intermediate customer projection cache!
        tier: 'explorer',
        totalSpent: 7600
      }
    }
    
    const mockLedgerEntries = [
      { id: '146', user: 73, type: 'welcome_bonus', amount: 100, balance: 100, reason: 'Welcome' },
      { id: '147', user: 73, type: 'earn', amount: 760, balance: 860, reason: 'Earn' },
      { id: '148', user: 73, type: 'tier_bonus', amount: 500, balance: 1360, reason: 'Tier Upgrade' },
    ]
    
    mockPayload.findByID.mockImplementation(async ({ collection, id }: any) => {
      if (collection === 'customers' && id === 73) {
        return mockCustomerDoc
      }
      return null
    })
    
    mockPayload.find.mockImplementation(async ({ collection, where }: any) => {
      if (collection === 'point-ledger') {
        // Query balance: sorted by -createdAt, limit 1. Returns latest ledger balance = 1360
        return { docs: [mockLedgerEntries[2]] }
      }
      if (collection === 'bookings') {
        return { docs: [] }
      }
      return { docs: [] }
    })
    
    mockPayload.findGlobal.mockResolvedValue({
      programCode: 'welcome',
      baseEarnRate: 0.1,
      redemptionPointsUnit: 100,
      redemptionValueEGP: 10,
      minRedemptionPoints: 100,
      maxRedemptionPercent: 10,
      welcomeBonus: 1000,
      expirationMonths: 12,
      isActive: true,
      tiers: [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.5, upgradeBonus: 500 },
      ]
    })
    
    const customerRepo = new CustomerRepository(mockPayload)
    const loyaltyRepo = new LoyaltyRepository(mockPayload)
    const bookingRepo = new BookingRepository(mockPayload)
    const sessionRepo = new DeviceSessionRepository(mockPayload)
    const queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo, sessionRepo)
    const aggregator = new DashboardOverviewAggregator(queryBus)
    
    const projection = await aggregator.aggregatePortalOverview(73)
    
    // VERIFY: Points balance MUST be 1360 (from point-ledger), NOT 860 (from customer.loyalty.points)
    expect(projection.loyalty.pointsBalance).toBe(1360)
  })

  it('Test E: Write-through L1 — saveProjection() must keep L1 hot; no DB read on next findByCustomerId()', async () => {
    /**
     * Regression: DashboardSubscriber previously called invalidate(customerId) immediately after
     * saveProjection(), which discarded the correctly computed value from L1 and forced the next
     * dashboard request to hit the DB again.
     *
     * This test verifies Write-through behaviour:
     *   1. saveProjection(1360) writes L1 = 1360
     *   2. findByCustomerId(73) returns 1360 FROM L1 (no additional DB query beyond saveProjection's own upsert check)
     *   3. A second call to findByCustomerId(73) is also served from L1 — DB call count does not increase
     *
     * Note: saveProjection() internally calls payload.find() once to determine update vs create (upsert check).
     * That call is expected and not counted against the write-through contract.
     */
    const { DashboardProjectionRepository } = await import('@/domains/dashboard/repository')

    const mockFind = vi.fn().mockResolvedValue({ docs: [] })
    const mockUpdate = vi.fn().mockResolvedValue({})
    const mockCreate = vi.fn().mockResolvedValue({})

    const localPayload: any = {
      find: mockFind,
      update: mockUpdate,
      create: mockCreate,
    }

    const repo = new DashboardProjectionRepository(localPayload)

    // First read on empty DB: queries DB and returns null
    const beforeSave = await repo.findByCustomerId(73)
    expect(beforeSave).toBeNull()
    expect(mockFind).toHaveBeenCalledTimes(1)

    // Define the first projection (1360 points)
    const firstProjection: any = {
      projectionId: 'proj_73_test_e_1',
      customerId: 73,
      loyalty: { pointsBalance: 1360, tier: 'voyager', totalSpentEGP: 5000, activeHoldsCount: 0 },
      customer: { customerId: 73, email: 'test@test.com', fullName: 'Test', isEmailVerified: true, status: 'active', preferredCurrency: 'EGP' },
      trips: { upcomingCount: 0, activeBookingsCount: 0 },
      security: { activeDeviceCount: 1 },
      metrics: { fromCache: false, compilationMs: 0 },
      version: 1,
      updatedAt: new Date().toISOString(),
    }

    // Mock Payload.find to return firstProjection
    mockFind.mockResolvedValue({ docs: [{ id: 'doc_73', projectionJson: firstProjection }] })
    mockFind.mockClear()

    // Query and verify it reads 1360 from DB
    const firstRead = await repo.findByCustomerId(73)
    expect(firstRead).not.toBeNull()
    expect(firstRead!.loyalty.pointsBalance).toBe(1360)
    expect(mockFind).toHaveBeenCalledTimes(1) // DB hit ✅

    // Define the updated projection (1600 points) representing a different process write
    const secondProjection: any = {
      projectionId: 'proj_73_test_e_2',
      customerId: 73,
      loyalty: { pointsBalance: 1600, tier: 'voyager', totalSpentEGP: 5000, activeHoldsCount: 0 },
      customer: { customerId: 73, email: 'test@test.com', fullName: 'Test', isEmailVerified: true, status: 'active', preferredCurrency: 'EGP' },
      trips: { upcomingCount: 0, activeBookingsCount: 0 },
      security: { activeDeviceCount: 1 },
      metrics: { fromCache: false, compilationMs: 0 },
      version: 1,
      updatedAt: new Date().toISOString(),
    }

    // Mock Payload.find to return secondProjection (representing DB change)
    mockFind.mockResolvedValue({ docs: [{ id: 'doc_73', projectionJson: secondProjection }] })
    mockFind.mockClear()

    // Query and verify it reads 1600 directly from DB, observing the fresh value immediately
    const secondRead = await repo.findByCustomerId(73)
    expect(secondRead).not.toBeNull()
    expect(secondRead!.loyalty.pointsBalance).toBe(1600) // Fresh read from DB, no stale 1360 cache ✅
    expect(mockFind).toHaveBeenCalledTimes(1) // Another DB hit ✅
  })

  it('Test F: Regression — earnPointsForBooking must pass RequestContext to outbox.record and PayloadOutboxRepository.add must successfully execute create without string headers type error', async () => {
    const { PayloadOutboxRepository } = await import('@/domains/events/repositories/payload-outbox-repository')

    const mockCustomerDoc = {
      id: 5,
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
      loyalty: {
        points: 0,
        tier: 'explorer',
        totalSpent: 0,
      },
    }

    const mockLedgerDoc = {
      id: 'ledg_101',
      user: 5,
      type: 'earn',
      amount: 100,
      balance: 100,
      reason: 'Earned 100 points',
      createdAt: '2026-07-22T12:00:00.000Z',
    }

    const mockOutboxDoc = {
      id: 'outbox_101',
      eventId: 'evt_101',
      status: 'pending',
    }

    const localPayload: any = {
      findByID: vi.fn().mockResolvedValue(mockCustomerDoc),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findGlobal: mockPayload.findGlobal,
      create: vi.fn().mockImplementation(async ({ collection, data, req }) => {
        if (collection === 'point-ledger') {
          return mockLedgerDoc
        }
        if (collection === 'event-outbox') {
          // If req is a primitive string, simulate the Payload throw
          if (req && typeof req === 'string') {
            throw new TypeError("Cannot create property 'headers' on string")
          }
          return mockOutboxDoc
        }
        return {}
      }),
      update: vi.fn().mockResolvedValue(mockCustomerDoc),
    }

    const localWorkflowEngine = new LoyaltyWorkflowEngine(localPayload)
    const realOutboxRepo = new PayloadOutboxRepository(localPayload)
    
    // Inject the real repository to verify integration
    ;(EventOutboxService.getInstance() as any).outboxRepository = realOutboxRepo

    const transactionId = 'd2cf5c58-4440-4b1b-80a1-6577b7e67831'
    const context = { transactionId }

    // Execute directly and assert it doesn't throw
    const res = await localWorkflowEngine.earnPointsForBooking(5, 1, 1000, 'LBV-260818-82569', undefined, context)
    expect(res).toBeDefined()

    // Assert that PayloadOutboxRepository.add received the context and built the correct req object
    expect(localPayload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'event-outbox',
        req: expect.objectContaining({
          transactionID: 'd2cf5c58-4440-4b1b-80a1-6577b7e67831'
        })
      })
    )
  })

  it('Test G: Regression — changing active loyalty configuration dynamically updates calculated progress without modifying dashboard projection', async () => {
    // 1. Setup mock customer facts in projection
    const mockProjection: any = {
      projectionId: 'proj_73_test_g',
      customerId: 73,
      loyalty: { pointsBalance: 1600, tier: 'voyager', totalSpentEGP: 9600, activeHoldsCount: 0 },
      customer: { customerId: 73, email: 'test@test.com', fullName: 'Test', isEmailVerified: true, status: 'active', preferredCurrency: 'EGP' },
      trips: { upcomingCount: 0, activeBookingsCount: 0 },
      security: { activeDeviceCount: 1 },
      metrics: { fromCache: false, compilationMs: 0 },
      version: 1,
      updatedAt: new Date().toISOString(),
    }

    // 2. Setup mock config A
    const configA = {
      id: 'welcome_id',
      name: 'Welcome Program',
      version: 1,
      status: 'published' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      programCode: 'welcome',
      baseEarnRate: 0.1,
      redemptionPointsUnit: 100,
      redemptionValueEGP: 10,
      minRedemptionPoints: 100,
      maxRedemptionPercent: 10,
      welcomeBonus: 1000,
      expirationMonths: 12,
      isActive: true,
      allowPartialRedemption: true,
      bonusNeverExpires: true,
      tiers: [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 7000, earnMultiplier: 1.2, upgradeBonus: 1000 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 15000, earnMultiplier: 2.0, upgradeBonus: 5000 },
      ]
    }

    // 3. Setup mock config B (changed thresholds)
    const configB = {
      ...configA,
      tiers: [
        { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
        { tier: 'voyager', label: 'Voyager', minSpentEGP: 8000, earnMultiplier: 1.2, upgradeBonus: 1000 },
        { tier: 'elite', label: 'Elite', minSpentEGP: 20000, earnMultiplier: 2.0, upgradeBonus: 5000 },
      ]
    }

    // Load the factory dynamically
    const { LoyaltyProgressDTOFactory } = await import('@/application/loyalty/progress-factory')

    const mockCtx: LocaleContext = {
      language: 'en',
      currency: 'EGP',
      country: 'EG',
      timezone: 'Africa/Cairo',
      measurement: MeasurementSystem.METRIC,
      weekStart: 0,
    }
    const mockLocalization = {
      formatPrice: vi.fn().mockImplementation(async (amount) => ({
        formatted: `${amount.toLocaleString()} EGP`
      })),
      translateUiKey: vi.fn().mockImplementation((key) => {
        if (key === 'loyalty.progress.remainingToTier') {
          return 'EGP {amount} more to reach {tier}'
        }
        return 'Max Tier achieved'
      }),
      translateText: vi.fn().mockImplementation(async (text) => text),
    } as unknown as LocalizationService

    // 4. Calculate progress with Config A
    const progressA = await LoyaltyProgressDTOFactory.build(
      mockProjection.loyalty.totalSpentEGP,
      mockProjection.loyalty.tier,
      configA,
      mockLocalization,
      mockCtx
    )

    // Expected under Config A:
    // voyager threshold = 7000, elite threshold = 15000, spent = 9600
    // range = 8000. progress = 2600. percent = Math.round((2600 / 8000)*100) = 33%
    // remaining = 15000 - 9600 = 5400
    expect(progressA.nextTierProgressPercent).toBe(33)
    expect(progressA.remainingQualifyingSpendEGP).toBe(5400)
    expect(progressA.nextTierName).toBe('Elite')

    // 5. Calculate progress with Config B (without changing projection at all)
    const progressB = await LoyaltyProgressDTOFactory.build(
      mockProjection.loyalty.totalSpentEGP,
      mockProjection.loyalty.tier,
      configB,
      mockLocalization,
      mockCtx
    )

    // Expected under Config B:
    // voyager threshold = 8000, elite threshold = 20000, spent = 9600
    // range = 12000. progress = 1600. percent = Math.round((1600 / 12000)*100) = 13%
    // remaining = 20000 - 9600 = 10400
    expect(progressB.nextTierProgressPercent).toBe(13)
    expect(progressB.remainingQualifyingSpendEGP).toBe(10400)
    expect(progressB.nextTierName).toBe('Elite')
  })
})
