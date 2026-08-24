import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExperienceRepository } from '@/domains/experience/repository'
import { ExperienceService } from '@/domains/experience/service'
import { ExperienceWorkflowEngine } from '@/domains/experience/workflow'

describe('BATCH 17E — Corrupt Data & Fail-Fast Invariant Verification', () => {
  let repository: ExperienceRepository
  let workflowEngine: ExperienceWorkflowEngine
  let service: ExperienceService
  let mockPayload: any
  let mockQueries: any

  beforeEach(() => {
    mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    }
    mockQueries = {
      findDepartureSlotById: vi.fn(),
      findDepartureSlotByDate: vi.fn(),
      findSlotsByExperienceId: vi.fn(),
      findDefaultSlot: vi.fn(),
      saveDepartureSlot: vi.fn(),
    }
    repository = new ExperienceRepository(mockPayload)
    workflowEngine = new ExperienceWorkflowEngine(repository, mockQueries)
    service = new ExperienceService(repository, workflowEngine)
  })

  describe('1. Invariant: Experience duration.days must be >= 1 (Fail-Fast)', () => {
    it('should throw an explicit error if doc.duration.days is missing or < 1', () => {
      const corruptDoc: any = {
        id: 99,
        slug: 'corrupt-tour',
        title: 'Corrupt Tour',
        city: 10,
        availability: { type: 'daily' },
        type: 'package',
        price: 5000,
        duration: { days: 0 },
      }

      expect(() => repository.mapDocToAggregate(corruptDoc)).toThrowError(
        /missing required duration\.days/i,
      )
    })

    it('should throw an explicit error if doc.duration is completely undefined', () => {
      const corruptDoc: any = {
        id: 99,
        slug: 'corrupt-tour',
        title: 'Corrupt Tour',
        city: 10,
        availability: { type: 'daily' },
        type: 'package',
        price: 5000,
      }

      expect(() => repository.mapDocToAggregate(corruptDoc)).toThrowError(
        /missing required duration\.days/i,
      )
    })
  })

  describe('2. Invariant: Daily Tour schedules and defaultCapacity (No : 20 Fallback)', () => {
    it('should throw an explicit error if requested startTime does not exist in schedules', async () => {
      const dailyTourAggregate: any = {
        id: 200,
        title: 'Pyramids Daily Tour',
        type: 'daily_tour',
        price: 1500,
        durationDays: 1,
        schedules: [{ startTime: '09:00', defaultCapacity: 10 }],
      }

      vi.spyOn(repository, 'findById').mockResolvedValue(dailyTourAggregate)
      mockQueries.findDepartureSlotByDate.mockResolvedValue(null)
      mockPayload.find.mockResolvedValue({ docs: [] })

      await expect(
        service.getOrCreateDailyDeparture(200, '2026-10-01', '14:00'),
      ).rejects.toThrowError(/Requested startTime "14:00" is not a configured schedule/i)
    })

    it('should throw an explicit error if schedule defaultCapacity is invalid (< 1)', async () => {
      const corruptScheduleDoc: any = {
        id: 201,
        slug: 'corrupt-schedule-tour',
        title: 'Corrupt Schedule Tour',
        city: 10,
        availability: { type: 'daily' },
        type: 'daily_tour',
        price: 1500,
        duration: { durationMinutes: 240 },
        schedules: [{ startTime: '09:00', defaultCapacity: 0 }],
      }

      expect(() => repository.mapDocToAggregate(corruptScheduleDoc)).toThrowError(
        /invalid defaultCapacity/i,
      )
    })

    it('should throw an explicit error if daily tour is missing durationMinutes', () => {
      const missingDurationMinutesDoc: any = {
        id: 202,
        slug: 'missing-minutes-tour',
        title: 'Missing Minutes Tour',
        city: 10,
        availability: { type: 'daily' },
        type: 'daily_tour',
        price: 1500,
        duration: {},
        schedules: [{ startTime: '09:00', defaultCapacity: 10 }],
      }

      expect(() => repository.mapDocToAggregate(missingDurationMinutesDoc)).toThrowError(
        /missing required duration\.durationMinutes/i,
      )
    })
  })

  describe('3. Invariant: Slot Non-Existence & Capacity Integrity', () => {
    it('should throw an explicit error when resolving a non-existent slot', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue({
        id: 300,
        title: 'Sample Tour',
        type: 'package',
        durationDays: 3,
      } as any)
      mockQueries.findDepartureSlotById.mockResolvedValue(null)

      await expect(
        service.resolveBookableDepartureBySlot(300, 99999),
      ).rejects.toThrowError(/Departure slot with ID 99999 not found/i)
    })
  })

  describe('4. Invariant: Media & Policies Nullability (Legitimate Empty States without Mock)', () => {
    it('should map empty gallery and undefined heroUrl to empty array without mock fallbacks', () => {
      const docWithoutMedia: any = {
        id: 400,
        slug: 'no-media-tour',
        title: 'No Media Tour',
        city: 10,
        availability: { type: 'daily' },
        type: 'package',
        price: 2000,
        duration: { days: 2 },
        hero: null,
        gallery: [],
      }

      const aggregate = repository.mapDocToAggregate(docWithoutMedia)
      expect(aggregate.heroUrl).toBeUndefined()
      expect(aggregate.gallery).toEqual([])
    })

    it('should serialize empty/undefined policies cleanly without throwing or fabricating', () => {
      const docWithoutPolicies: any = {
        id: 401,
        slug: 'no-policies-tour',
        title: 'No Policies Tour',
        city: 10,
        availability: { type: 'daily' },
        type: 'package',
        price: 2000,
        duration: { days: 2 },
        policies: null,
      }

      const aggregate = repository.mapDocToAggregate(docWithoutPolicies)
      expect(aggregate.policiesHtml).toBeUndefined()
    })
  })
})
