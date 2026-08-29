import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '@/domains/events/event-bus'
import { registerDashboardProjectionSubscribers } from '@/domains/events/subscribers/dashboard-subscriber'
import { CustomerNotFoundException } from '@/domains/shared/exceptions/domain-exception'
import type { Payload } from 'payload'

describe('Unit: DashboardSubscriber Idempotency & Error Propagation', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = EventBus.getInstance()
  })

  it('propagates CustomerNotFoundException to EventBus when LOYALTY_EARNED refers to missing customer (TEST F)', async () => {
    const mockPayload = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx_1'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
      findByID: vi.fn().mockRejectedValue(new CustomerNotFoundException(441)),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
    } as unknown as Payload

    registerDashboardProjectionSubscribers(mockPayload)

    const event = {
      type: 'LOYALTY_EARNED' as const,
      eventId: 'evt_test_dash_fail_441',
      correlationId: 'corr_test_dash_fail',
      eventVersion: 1,
      customerId: 441,
      points: 100,
      balance: 100,
    }

    // Must reject and bubble up the error to EventBus (NO FALSE SUCCESS)
    await expect(eventBus.publish(event)).rejects.toThrow()
    // Must rollback transaction
    expect(mockPayload.db.rollbackTransaction).toHaveBeenCalledWith('tx_1')
  })

  it('rolls back Inbox acquisition when processing fails before commit (TEST B)', async () => {
    const mockPayload = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx_fail_b'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
      findByID: vi.fn().mockRejectedValue(new Error('Database query crash')),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
    } as unknown as Payload

    registerDashboardProjectionSubscribers(mockPayload)

    const event = {
      type: 'BOOKING_CANCELLED' as const,
      eventId: 'evt_test_cancel_fail_b',
      correlationId: 'corr_test_b',
      eventVersion: 1,
      booking: { id: 12, customerId: 50 } as any,
      actor: { id: 'admin', type: 'staff' as const, name: 'Admin' },
      reason: 'Customer request',
    }

    await expect(eventBus.publish(event)).rejects.toThrow('Database query crash')
    expect(mockPayload.db.rollbackTransaction).toHaveBeenCalledWith('tx_fail_b')
    expect(mockPayload.db.commitTransaction).not.toHaveBeenCalled()
  })

  it('skips duplicate execution and suppresses secondary event when event is retried after prior success (TEST A)', async () => {
    let inboxAcquired = false
    let projectionSaveCount = 0

    const mockPayload = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx_idempotent_a'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
      find: vi.fn().mockImplementation(({ collection }) => {
        if (collection === 'event-inbox') {
          return Promise.resolve({
            docs: inboxAcquired ? [{ id: 1, idempotencyKey: 'evt_test_retry_a:DashboardSubscriber.updateProjectionOnLoyalty' }] : [],
          })
        }
        if (collection === 'customers') {
          return Promise.resolve({
            docs: [{ id: 100, email: 'user@test.com', firstName: 'A', lastName: 'B', status: 'active', _verified: true }],
          })
        }
        if (collection === 'loyalty-programs') {
          return Promise.resolve({
            docs: [{ id: 1, baseEarnRate: 0.1, redemptionPointsUnit: 100, redemptionValueEGP: 10 }],
          })
        }
        return Promise.resolve({ docs: [] })
      }),
      findGlobal: vi.fn().mockResolvedValue({
        programCode: 'DEFAULT',
        baseEarnRate: 0.1,
        redemptionPointsUnit: 100,
        redemptionValueEGP: 10,
        minRedemptionPoints: 0,
        maxRedemptionPercent: 50,
        welcomeBonus: 1000,
        expirationMonths: 12,
        tiers: [
          {
            tier: 'bronze',
            label: 'Bronze',
            minSpentEGP: 0,
            earnMultiplier: 1,
            upgradeBonus: 0,
          },
        ],
      }),
      findByID: vi.fn().mockImplementation(({ collection, id }) => {
        if (collection === 'customers') {
          return Promise.resolve({ id, email: 'user@test.com', firstName: 'A', lastName: 'B', status: 'active', _verified: true })
        }
        return Promise.resolve({ id: 1 })
      }),
      create: vi.fn().mockImplementation(({ collection }) => {
        if (collection === 'event-inbox') {
          if (inboxAcquired) {
            throw new Error('duplicate key value violates unique constraint')
          }
          inboxAcquired = true
          return Promise.resolve({ id: 1 })
        }
        if (collection === 'dashboard-projections') {
          projectionSaveCount++
          return Promise.resolve({ id: 1 })
        }
        return Promise.resolve({ id: 1 })
      }),
      update: vi.fn().mockImplementation(({ collection }) => {
        if (collection === 'dashboard-projections') {
          projectionSaveCount++
          return Promise.resolve({ id: 1 })
        }
        return Promise.resolve({ id: 1 })
      }),
    } as unknown as Payload

    registerDashboardProjectionSubscribers(mockPayload)

    const event = {
      type: 'LOYALTY_EARNED' as const,
      eventId: 'evt_test_retry_a',
      correlationId: 'corr_test_a',
      eventVersion: 1,
      customerId: 100,
      points: 200,
      balance: 200,
    }

    // 1st Execution: Acquires inbox, calculates projection, saves projection, commits
    await eventBus.publish(event)
    expect(projectionSaveCount).toBe(1)
    expect(mockPayload.db.commitTransaction).toHaveBeenCalledTimes(1)

    // 2nd Execution (Retry after another subscriber failed):
    // Inbox is already acquired -> Should skip calculation and save
    await eventBus.publish(event)
    // Projection save count must NOT increase (Idempotent!)
    expect(projectionSaveCount).toBe(1)
  })
})
