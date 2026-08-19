import { describe, it, expect, vi } from 'vitest'
import { DashboardProjectionRepository } from '@/domains/dashboard/repository'
import type { CustomerPortalProjection } from '@/domains/dashboard/types'

describe('Dashboard Domain: CQRS Projection Repository Unit Tests', () => {
  it('should save and retrieve CQRS CustomerPortalProjection read models from repository cache', async () => {
    const savedProjections: any[] = []
    const mockPayload: any = {
      find: vi.fn().mockImplementation(async ({ collection, where }) => {
        if (collection === 'dashboard-projections') {
          const customerId = where?.customer?.equals
          const doc = savedProjections.find((p) => p.customer === customerId)
          return { docs: doc ? [doc] : [] }
        }
        return { docs: [] }
      }),
      create: vi.fn().mockImplementation(async ({ collection, data }) => {
        if (collection === 'dashboard-projections') {
          const doc = { id: `proj_doc_${Date.now()}`, ...data }
          savedProjections.push(doc)
          return doc
        }
        return {}
      }),
      update: vi.fn().mockImplementation(async ({ collection, id, data }) => {
        if (collection === 'dashboard-projections') {
          const index = savedProjections.findIndex((p) => p.id === id)
          if (index !== -1) {
            savedProjections[index] = { ...savedProjections[index], ...data }
            return savedProjections[index]
          }
        }
        return {}
      })
    }

    const repo = new DashboardProjectionRepository(mockPayload)
    const mockProjection: CustomerPortalProjection = {
      projectionId: 'proj_1_101',
      customerId: 1,
      customer: { customerId: 1, email: 'ahmed@laube.com', fullName: 'Ahmed', isEmailVerified: true, status: 'active', preferredCurrency: 'EGP' },
      loyalty: { tier: 'explorer', pointsBalance: 100, activeHoldsCount: 0, totalSpentEGP: 5000 },
      trips: { upcomingCount: 1, activeBookingsCount: 1 },
      security: { activeDeviceCount: 1 },
      metrics: { cacheHit: true, aggregationDurationMs: 2, projectionVersion: 'v1.0.0', lastRefreshAt: '2026-07-22T00:00:00.000Z' },
      version: 1,
      updatedAt: '2026-07-22T00:00:00.000Z',
    }

    // Save and DB query check
    await repo.saveProjection(mockProjection)
    const fetchedDb = await repo.findByCustomerId(1)
    expect(fetchedDb).not.toBeNull()
    expect(fetchedDb?.loyalty.pointsBalance).toBe(100)
    expect(mockPayload.find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'dashboard-projections'
    }))
  })

  it('Test B (Stale customer must never win): should retrieve from dashboard-projections directly, ignoring customer document fields', async () => {
    const mockProjection: CustomerPortalProjection = {
      projectionId: 'proj_1_102',
      customerId: 1,
      customer: { customerId: 1, email: 'ahmed@laube.com', fullName: 'Ahmed', isEmailVerified: true, status: 'active', preferredCurrency: 'EGP' },
      loyalty: { tier: 'explorer', pointsBalance: 1360, activeHoldsCount: 0, totalSpentEGP: 5000 },
      trips: { upcomingCount: 1, activeBookingsCount: 1 },
      security: { activeDeviceCount: 1 },
      metrics: { cacheHit: true, aggregationDurationMs: 2, projectionVersion: 'v1.0.0', lastRefreshAt: '2026-07-22T00:00:00.000Z' },
      version: 1,
      updatedAt: '2026-07-22T00:00:00.000Z',
    }

    const mockPayload: any = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            id: 'proj_doc_1',
            customer: 1,
            projectionJson: mockProjection,
          }
        ]
      })
    }

    const repo = new DashboardProjectionRepository(mockPayload)
    // We call findByCustomerId, which queries DB directly
    const fetched = await repo.findByCustomerId(1)

    expect(fetched).not.toBeNull()
    expect(fetched?.loyalty.pointsBalance).toBe(1360)
    expect(mockPayload.find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'dashboard-projections'
    }))
  })
})
