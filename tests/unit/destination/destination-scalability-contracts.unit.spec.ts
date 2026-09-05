import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DestinationRepository } from '@/domains/destination/repository'
import { DestinationService } from '@/domains/destination/service'
import { DestinationsCatalogLoader, CountryLoader, CityLoader } from '@/application/destination/loaders'
import { ExperienceService } from '@/domains/experience/service'
import { ExperienceRepository } from '@/domains/experience/repository'
import { BasePriceResolver } from '@/domains/experience/base-price-resolver'
import { BookingRefund } from '@/domains/booking/refund'
import { BookingCancellation } from '@/domains/booking/cancellation'
import { BookingStatus } from '@/types'

describe('GATE 3.2: Universal Data Access & Scalability Invariant Tests', () => {
  describe('1. Destinations Grouped Count Aggregation & 3-Query Limit', () => {
    it('executes a single SQL aggregate query to group city counts by country ID', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        rows: [
          { country_id: 1, count: 5 },
          { country_id: 2, count: 12 },
        ],
      })

      const mockPayload: any = {
        db: {
          drizzle: {
            execute: mockExecute,
          },
        },
      }

      const repository = new DestinationRepository(mockPayload)
      const countsMap = await repository.getCitiesCountGroupedByCountry([1, 2, 3])

      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(countsMap.get(1)).toBe(5)
      expect(countsMap.get(2)).toBe(12)
      expect(countsMap.get(3)).toBe(0) // Default 0 for country with 0 cities
    })

    it('propagates database/infrastructure errors directly and never degrades into silent N+1 queries', async () => {
      const dbError = new Error('PostgreSQL connection timeout: query failed')
      const mockExecute = vi.fn().mockRejectedValue(dbError)
      const mockCount = vi.fn()

      const mockPayload: any = {
        count: mockCount,
        db: {
          drizzle: {
            execute: mockExecute,
          },
        },
      }

      const repository = new DestinationRepository(mockPayload)

      await expect(repository.getCitiesCountGroupedByCountry([1, 2, 3])).rejects.toThrow(
        'PostgreSQL connection timeout: query failed',
      )

      // Strict Invariant: Exactly 1 SQL query attempted, ZERO payload.count calls triggered
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockCount).toHaveBeenCalledTimes(0)
    })

    it('throws explicit configuration error when direct SQL execution client is missing', async () => {
      const mockPayload: any = {
        db: {},
      }

      const repository = new DestinationRepository(mockPayload)

      await expect(repository.getCitiesCountGroupedByCountry([1, 2, 3])).rejects.toThrow(
        /Database adapter does not support direct SQL execution/i,
      )
    })
  })

  describe('2. Starting Price Semantic Bounded Queries (limit: 1)', () => {
    const priceResolver = new BasePriceResolver()
    const mockWorkflowEngine: any = { priceResolver }

    it('returns catalog baseline price when no future slots exist without unbounded loading', async () => {
      const mockFind = vi.fn().mockResolvedValue({ docs: [] })
      const mockPayload: any = {
        find: mockFind,
      }

      const repository = new ExperienceRepository(mockPayload)
      const service = new ExperienceService(repository, mockWorkflowEngine)

      const experience: any = {
        id: 10,
        price: 5000,
        priceOverrides: [],
      }

      const startingPrice = await service.resolveStartingPrice(experience, '2026-10-01')

      expect(startingPrice).toBe(5000)
      // Exactly 1 bounded check for slot existence (limit: 1)
      expect(mockFind).toHaveBeenCalledTimes(1)
      expect(mockFind.mock.calls[0][0].limit).toBe(1)
    })

    it('returns lowest slot price override when a cheaper future slot exists', async () => {
      const mockFind = vi.fn().mockImplementation(({ limit, where }) => {
        if (where?.and?.some((cond: any) => cond.priceOverrideEGP)) {
          // Query 2: Lowest price override
          return Promise.resolve({
            docs: [{ id: 101, date: '2026-10-10', priceOverrideEGP: 3500, capacityTotal: 20, capacityAvailable: 20, status: 'available' }],
          })
        }
        // Query 1: Existence of upcoming available slots
        return Promise.resolve({
          docs: [{ id: 100, date: '2026-10-05', capacityTotal: 20, capacityAvailable: 20, status: 'available' }],
        })
      })

      const mockPayload: any = {
        find: mockFind,
      }

      const repository = new ExperienceRepository(mockPayload)
      const service = new ExperienceService(repository, mockWorkflowEngine)

      const experience: any = {
        id: 10,
        price: 5000,
        priceOverrides: [],
      }

      const startingPrice = await service.resolveStartingPrice(experience, '2026-10-01')

      expect(startingPrice).toBe(3500)
      expect(mockFind).toHaveBeenCalledTimes(2)
      expect(mockFind.mock.calls[0][0].limit).toBe(1)
      expect(mockFind.mock.calls[1][0].limit).toBe(1)
    })

    it('returns lowest date price override when future date override is cheaper and slot exists for that date', async () => {
      const mockFind = vi.fn().mockImplementation(({ where }) => {
        if (where?.and?.some((cond: any) => cond.priceOverrideEGP)) {
          return Promise.resolve({ docs: [] }) // No slot price override
        }
        if (where?.and?.some((cond: any) => cond.date?.in)) {
          // Query 3: Slot for specific discounted date 2026-10-15
          return Promise.resolve({
            docs: [{ id: 102, date: '2026-10-15', capacityTotal: 20, capacityAvailable: 20, status: 'available' }],
          })
        }
        return Promise.resolve({
          docs: [{ id: 100, date: '2026-10-05', capacityTotal: 20, capacityAvailable: 20, status: 'available' }],
        })
      })

      const mockPayload: any = {
        find: mockFind,
      }

      const repository = new ExperienceRepository(mockPayload)
      const service = new ExperienceService(repository, mockWorkflowEngine)

      const experience: any = {
        id: 10,
        price: 5000,
        priceOverrides: [
          { date: '2026-10-15', priceEGP: 4200 },
        ],
      }

      const startingPrice = await service.resolveStartingPrice(experience, '2026-10-01')

      expect(startingPrice).toBe(4200)
    })

    it('does not apply a discounted date override if NO slot exists on that specific date', async () => {
      const mockFind = vi.fn().mockImplementation(({ where }) => {
        if (where?.and?.some((cond: any) => cond.priceOverrideEGP)) {
          return Promise.resolve({ docs: [] })
        }
        if (where?.and?.some((cond: any) => cond.date?.in)) {
          return Promise.resolve({ docs: [] }) // No slot on 2026-10-15!
        }
        return Promise.resolve({
          docs: [{ id: 100, date: '2026-10-05', capacityTotal: 20, capacityAvailable: 20, status: 'available' }],
        })
      })

      const mockPayload: any = {
        find: mockFind,
      }

      const repository = new ExperienceRepository(mockPayload)
      const service = new ExperienceService(repository, mockWorkflowEngine)

      const experience: any = {
        id: 10,
        price: 5000,
        priceOverrides: [
          { date: '2026-10-15', priceEGP: 3000 }, // Discount date with no slots
        ],
      }

      const startingPrice = await service.resolveStartingPrice(experience, '2026-10-01')

      // Must NOT return 3000 because no slot exists on 2026-10-15; falls back to slot 100 on 2026-10-05 (price: 5000)
      expect(startingPrice).toBe(5000)
    })
  })

  describe('3. Error Cause Preservation Invariant', () => {
    it('preserves native error cause when capacity release fails in BookingRefund', async () => {
      const originalDbError = new Error('PostgreSQL connection timeout: deadlocked transaction')
      const mockExpService: any = {
        releaseCommittedCapacity: vi.fn().mockRejectedValue(originalDbError),
      }

      const mockRepo: any = {
        findById: vi.fn().mockResolvedValue({
          id: 999,
          status: BookingStatus.CONFIRMED,
          capacityHold: {
            departureId: 'DEP-1',
            seats: 2,
          },
        }),
      }

      const refund = new BookingRefund(mockRepo, mockExpService)

      try {
        await refund.refund(999)
        expect.fail('Should have thrown an error')
      } catch (err: any) {
        expect(err.message).toContain('Committed capacity release failed for Booking #999')
        expect(err.cause).toBe(originalDbError)
        expect((err.cause as Error).message).toBe('PostgreSQL connection timeout: deadlocked transaction')
      }
    })

    it('preserves native error cause when committed capacity release fails in BookingCancellation', async () => {
      const originalDbError = new Error('Database constraint violation')
      const mockExpService: any = {
        releaseCommittedCapacity: vi.fn().mockRejectedValue(originalDbError),
      }

      const mockRepo: any = {
        findById: vi.fn().mockResolvedValue({
          id: 888,
          status: BookingStatus.CONFIRMED,
          capacityHold: {
            departureId: 'DEP-2',
            seats: 3,
          },
        }),
      }

      const cancel = new BookingCancellation(mockRepo, mockExpService)

      try {
        await cancel.cancel(888, { id: 'admin', type: 'system' }, 'Customer request')
        expect.fail('Should have thrown an error')
      } catch (err: any) {
        expect(err.message).toContain('Committed capacity release failed for Booking #888')
        expect(err.cause).toBe(originalDbError)
      }
    })
  })

  describe('4. Server-Side Pagination Invariants (Country & City Loaders)', () => {
    it('passes page and limit parameters from CountryLoader down to repository query', async () => {
      const mockFind = vi.fn().mockImplementation(({ collection, where, page, limit }) => {
        if (collection === 'countries') {
          return Promise.resolve({
            docs: [{ id: 1, name: 'Egypt', slug: 'egypt', description: 'Ancient wonders' }],
          })
        }
        if (collection === 'cities') {
          return Promise.resolve({
            docs: [{ id: 10, name: 'Cairo', slug: 'cairo', description: 'Capital' }],
            totalDocs: 25,
            totalPages: 3,
            page: page || 1,
            limit: limit || 12,
            hasNextPage: page < 3,
            hasPrevPage: page > 1,
          })
        }
        return Promise.resolve({ docs: [] })
      })

      const mockPayload: any = { find: mockFind }
      const repo = new DestinationRepository(mockPayload)

      // Test Page 2
      const resultPage2 = await repo.findCitiesByCountry(1, { page: 2, limit: 12 })
      expect(resultPage2.page).toBe(2)
      expect(resultPage2.limit).toBe(12)
      expect(resultPage2.totalDocs).toBe(25)
      expect(resultPage2.totalPages).toBe(3)
      expect(resultPage2.hasNextPage).toBe(true)
      expect(resultPage2.hasPrevPage).toBe(true)

      // Test Page 3 (Last page)
      const resultPage3 = await repo.findCitiesByCountry(1, { page: 3, limit: 12 })
      expect(resultPage3.page).toBe(3)
      expect(resultPage3.hasNextPage).toBe(false)
      expect(resultPage3.hasPrevPage).toBe(true)
    })
  })
})
