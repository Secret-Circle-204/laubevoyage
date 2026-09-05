import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BasePriceResolver } from '@/domains/experience/base-price-resolver'
import { ExperienceService } from '@/domains/experience/service'
import { ExperienceWorkflowEngine } from '@/domains/experience/workflow'
import { ExperienceRepository } from '@/domains/experience/repository'
import type { PackageExperienceAggregate, DailyTourExperienceAggregate } from '@/domains/experience/aggregate'
import type { DepartureSlotEntity } from '@/domains/experience/types'

describe('Search, Bounded Batch Starting Price & Related Experiences Suite', () => {
  let mockPayload: any
  let repository: ExperienceRepository
  let service: ExperienceService
  let workflowEngine: ExperienceWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      find: vi.fn(),
      findByID: vi.fn(),
      update: vi.fn(),
      db: {
        pool: {
          query: vi.fn(),
        },
      },
    }
    repository = new ExperienceRepository(mockPayload)
    workflowEngine = new ExperienceWorkflowEngine(repository)
    service = new ExperienceService(repository, workflowEngine)
  })

  describe('1. Bounded Batch Starting Price Resolution (O(1) DB Operations)', () => {
    it('resolves Daily Tour starting prices in-memory (0 DB slot queries)', async () => {
      const dailyTour: DailyTourExperienceAggregate = {
        id: 101,
        title: 'Nile Felucca Ride',
        slug: 'nile-felucca-ride',
        cityId: 1,
        type: 'daily_tour',
        price: 800,
        availability: 'available',
        isActive: true,
        duration: { durationMinutes: 120 },
        durationMinutes: 120,
        version: 1,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        priceOverrides: [
          { date: '2026-10-15', priceEGP: 650, reason: 'Off-peak' },
          { date: '2026-08-01', priceEGP: 500, reason: 'Past' }, // Past date ignored
        ],
      }

      const result = await service.resolveStartingPricesBatch([dailyTour], '2026-09-01')

      // Invariant: Pool query was NOT called (0 SQL queries to departure_slots)
      expect(mockPayload.db.pool.query).not.toHaveBeenCalled()
      expect(result.get(101)).toBe(650) // Minimum of catalog 800 and future override 650
    })

    it('resolves Package starting prices via bounded candidate slots (<= 2 per package)', async () => {
      const packageExp: PackageExperienceAggregate = {
        id: 201,
        title: 'Classic Egypt 5-Day Tour',
        slug: 'classic-egypt-5-day-tour',
        cityId: 1,
        type: 'package',
        price: 15000,
        availability: 'available',
        isActive: true,
        duration: { days: 5, nights: 4 },
        durationDays: 5,
        durationNights: 4,
        version: 1,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      }

      // Mock DB returning 2 candidate rows: Earliest (15000) and Cheapest Override (12000)
      mockPayload.db.pool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            departure_id: 'DEP-201-1',
            experience_id: 201,
            date: '2026-10-01T09:00:00Z',
            start_time: '09:00',
            price_override_e_g_p: null,
            capacity_total: 20,
            capacity_reserved: 0,
            capacity_sold: 0,
            capacity_available: 20,
            version: 1,
            status: 'available',
          },
          {
            id: 2,
            departure_id: 'DEP-201-2',
            experience_id: 201,
            date: '2026-11-15T09:00:00Z',
            start_time: '09:00',
            price_override_e_g_p: 12000,
            capacity_total: 20,
            capacity_reserved: 0,
            capacity_sold: 0,
            capacity_available: 20,
            version: 1,
            status: 'available',
          },
        ],
      })

      const result = await service.resolveStartingPricesBatch([packageExp], '2026-09-01')

      expect(mockPayload.db.pool.query).toHaveBeenCalledTimes(1)
      expect(result.get(201)).toBe(12000) // Minimum of 15000 (catalog) and 12000 (override)
    })
  })

  describe('2. Bounded Related Experiences Showcase Contract', () => {
    it('fetches related experiences bounded at limit: 3 prioritizing same city and type', async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 301,
            title: 'Cairo Giza Pyramids Package',
            slug: 'cairo-giza-pyramids-package',
            type: 'package',
            city: 1,
            price: 5000,
            availability: 'available',
            isActive: true,
            duration: { days: 3, nights: 2 },
            createdAt: '2026-09-01',
            updatedAt: '2026-09-01',
          },
        ],
      }).mockResolvedValueOnce({
        docs: [
          {
            id: 302,
            title: 'Cairo Citadel Day Tour',
            slug: 'cairo-citadel-day-tour',
            type: 'daily_tour',
            city: 1,
            price: 1200,
            availability: 'available',
            isActive: true,
            duration: { durationMinutes: 180 },
            createdAt: '2026-09-01',
            updatedAt: '2026-09-01',
          },
        ],
      }).mockResolvedValueOnce({
        docs: [
          {
            id: 303,
            title: 'Luxor Temple Package',
            slug: 'luxor-temple-package',
            type: 'package',
            city: 2,
            price: 7000,
            availability: 'available',
            isActive: true,
            duration: { days: 4, nights: 3 },
            createdAt: '2026-09-01',
            updatedAt: '2026-09-01',
          },
        ],
      })

      const related = await service.getRelatedExperiences(200, 1, 'package', 3)

      expect(related.length).toBe(3)
      expect(related[0].id).toBe(301) // Same city + same type
      expect(related[1].id).toBe(302) // Same city + diff type
      expect(related[2].id).toBe(303) // Diff city + same type
    })
  })

  describe('3. Demand-Driven Server-Side Pagination Invariant', () => {
    it('returns exact requested slice with totalDocs without in-memory truncation', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [
          {
            id: 1,
            title: 'Exp 1',
            slug: 'exp-1',
            type: 'package',
            city: 1,
            price: 1000,
            availability: 'available',
            isActive: true,
            duration: { days: 2 },
            createdAt: '2026-09-01',
            updatedAt: '2026-09-01',
          },
        ],
        totalDocs: 485,
        totalPages: 41,
        page: 1,
        limit: 12,
        hasNextPage: true,
        hasPrevPage: false,
      })

      const result = await service.search({
        keyword: 'Cairo',
        page: 1,
        limit: 12,
      })

      expect(result.page).toBe(1)
      expect(result.limit).toBe(12)
      expect(result.totalDocs).toBe(485)
      expect(result.totalPages).toBe(41)
      expect(result.hasNextPage).toBe(true)
      expect(result.hasPrevPage).toBe(false)
      expect(result.docs.length).toBe(1)
    })
  })
})
