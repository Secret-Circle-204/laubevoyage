import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardOverviewAggregator } from '@/domains/dashboard/overview-aggregator'
import { DashboardQueryBus } from '@/domains/dashboard/query-bus'
import { DashboardProjectionRepository } from '@/domains/dashboard/repository'
import { registerDashboardProjectionSubscribers } from '@/domains/events/subscribers/dashboard-subscriber'
import { EventBus } from '@/domains/events/event-bus'
import { CustomerRepository } from '@/domains/customer/repositories/customer-repository'
import { LoyaltyRepository } from '@/domains/loyalty/repository'
import { BookingRepository } from '@/domains/booking/repository'
import type { CustomerUpdatedEvent } from '@/domains/events/customer-events'

describe('Dashboard Telemetry & CQRS Invalidation Integrity', () => {
  let mockPayload: any
  let customerRepo: CustomerRepository
  let loyaltyRepo: LoyaltyRepository
  let bookingRepo: BookingRepository
  let queryBus: DashboardQueryBus
  let aggregator: DashboardOverviewAggregator

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      update: vi.fn(),
      findByID: vi.fn().mockImplementation(async ({ id }) => ({
        id,
        email: 'user@laube.com',
        firstName: 'Farouk',
        lastName: 'Hosny',
        fullName: 'Farouk Hosny',
        status: 'active',
        lastLoginAt: '2026-08-19T02:00:00Z',
      })),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findGlobal: vi.fn().mockResolvedValue({
        programCode: 'LAUBE_EXP',
        baseEarnRate: 1,
        redemptionPointsUnit: 100,
        redemptionValueEGP: 10,
        minRedemptionPoints: 500,
        maxRedemptionPercent: 50,
        welcomeBonus: 500,
        expirationMonths: 12,
        isActive: true,
        tiers: [
          { tier: 'explorer', label: 'Explorer', minSpentEGP: 0, earnMultiplier: 1, upgradeBonus: 0 },
          { tier: 'voyager', label: 'Voyager', minSpentEGP: 5000, earnMultiplier: 1.5, upgradeBonus: 500 },
        ],
      }),
    }

    customerRepo = new CustomerRepository(mockPayload)
    loyaltyRepo = new LoyaltyRepository(mockPayload)
    bookingRepo = new BookingRepository(mockPayload)

    queryBus = new DashboardQueryBus(customerRepo, loyaltyRepo, bookingRepo)
    aggregator = new DashboardOverviewAggregator(queryBus)
  })

  describe('Invariant 4: Security Telemetry Aggregation', () => {
    it('MUST aggregate customer security metadata cleanly', async () => {
      const projection = await aggregator.aggregatePortalOverview(101)

      expect(projection.security).toBeDefined()
      expect(projection.security.lastLoginAt).toBe('2026-08-19T02:00:00.000Z')
    })
  })



  describe('Invariant 5: CQRS Single Canonical Invalidation on CUSTOMER_UPDATED', () => {
    it('MUST rebuild and save projection when CUSTOMER_UPDATED event is published', async () => {
      const eventBus = EventBus.getInstance()
      const projectionSaveSpy = vi.fn()
      mockPayload.create = projectionSaveSpy
      mockPayload.find = vi.fn().mockResolvedValue({ docs: [] }) // Cache miss -> save

      registerDashboardProjectionSubscribers(mockPayload)

      const updateEvent: CustomerUpdatedEvent = {
        type: 'CUSTOMER_UPDATED',
        eventId: 'evt_update_1',
        correlationId: 'corr_1',
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        customerId: 101,
        fullName: 'Updated Name',
        status: 'suspended',
      }

      await eventBus.publish(updateEvent)

      // Wait a tick for async subscriber execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      // VERIFY: Projection save was triggered
      expect(projectionSaveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'dashboard-projections',
          data: expect.objectContaining({
            customer: 101,
          }),
        }),
      )
    })
  })

  describe('Invariant 6: Projection Read Error Logging & Safe Fallback', () => {
    it('MUST log a structured warning and return null on database read failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const brokenPayload: any = {
        find: vi.fn().mockRejectedValue(new Error('PostgreSQL connection timeout')),
      }

      const repo = new DashboardProjectionRepository(brokenPayload)
      const result = await repo.findByCustomerId(101)

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DashboardProjectionRepository] Projection read failed for customer #101'),
        'PostgreSQL connection timeout',
      )

      warnSpy.mockRestore()
    })
  })
})
