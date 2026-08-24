import { describe, it, expect, vi } from 'vitest'
import { ExperienceRepository } from '@/domains/experience/repository'

describe('ExperienceRepository Domain Mapping & Invariants (BATCH 17A)', () => {
  const createMockPayload = (mockDoc: any, mockSlots: any[] = []) => ({
    findByID: vi.fn().mockImplementation(({ collection, id }) => {
      if (collection === 'experiences') {
        return Promise.resolve(mockDoc)
      }
      if (collection === 'departure-slots') {
        const slot = mockSlots.find((s) => s.id === id)
        return Promise.resolve(slot || null)
      }
      return Promise.resolve(null)
    }),
    find: vi.fn().mockImplementation(({ collection, where }) => {
      if (collection === 'experiences') {
        return Promise.resolve({ docs: mockDoc ? [mockDoc] : [] })
      }
      if (collection === 'departure-slots') {
        return Promise.resolve({ docs: mockSlots })
      }
      return Promise.resolve({ docs: [] })
    }),
    create: vi.fn(),
    update: vi.fn(),
  })

  describe('Duration Group Mapping (1:1 Schema)', () => {
    it('should map doc.duration.days and doc.duration.nights accurately to aggregate', async () => {
      const doc = {
        id: 1,
        title: 'Nile Cruise Luxury',
        slug: 'nile-cruise-luxury',
        type: 'package',
        city: { id: 10 },
        availability: 'available',
        duration: {
          days: 7,
          nights: 6,
        },
        price: 15000,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      const aggregate = await repo.findById(1)

      expect(aggregate.durationDays).toBe(7)
      expect(aggregate.durationNights).toBe(6)
    })

    it('should throw explicit domain error when duration.days is missing or less than 1', async () => {
      const doc = {
        id: 2,
        title: 'Invalid Duration Tour',
        slug: 'invalid-duration-tour',
        type: 'package',
        city: 10,
        availability: 'available',
        duration: {
          days: 0,
        },
        price: 5000,
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(2)).rejects.toThrow(
        '[ExperienceRepository] Database record for package #2 is missing required duration.days (must be >= 1).'
      )
    })

    it('should throw explicit domain error when duration object is missing entirely', async () => {
      const doc = {
        id: 3,
        title: 'Missing Duration Tour',
        slug: 'missing-duration-tour',
        type: 'package',
        city: 10,
        availability: 'available',
        price: 5000,
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(3)).rejects.toThrow(
        '[ExperienceRepository] Database record for package #3 is missing required duration.days (must be >= 1).'
      )
    })
  })

  describe('Policies Lexical Mapping', () => {
    it('should serialize doc.policies lexical structure to policiesHtml on aggregate', async () => {
      const doc = {
        id: 4,
        title: 'Pyramids Private Tour',
        slug: 'pyramids-private-tour',
        type: 'daily_tour',
        city: { id: 10 },
        availability: 'available',
        duration: { durationMinutes: 240 },
        price: 1200,
        schedules: [{ startTime: '09:00', defaultCapacity: 15 }],
        policies: {
          root: {
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: 'Free cancellation up to 24 hours before.' }],
              },
            ],
          },
        },
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      const aggregate = await repo.findById(4)

      expect(aggregate.policiesHtml).toBeDefined()
      expect(aggregate.policiesHtml).toContain('Free cancellation up to 24 hours before.')
    })

    it('should set policiesHtml to undefined if doc.policies is missing without mock fallbacks', async () => {
      const doc = {
        id: 5,
        title: 'Desert Safari Tour',
        slug: 'desert-safari-tour',
        type: 'daily_tour',
        city: { id: 10 },
        availability: 'available',
        duration: { durationMinutes: 240 },
        price: 2200,
        schedules: [{ startTime: '08:00', defaultCapacity: 10 }],
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      const aggregate = await repo.findById(5)

      expect(aggregate.policiesHtml).toBeUndefined()
    })
  })

  describe('Pricing & Duration Validation (Fail-Fast)', () => {
    it('should throw explicit domain error if daily_tour is missing price', async () => {
      const doc = {
        id: 6,
        title: 'Priceless Daily Tour',
        slug: 'priceless-daily-tour',
        type: 'daily_tour',
        city: { id: 10 },
        availability: 'available',
        duration: { durationMinutes: 240 },
        price: null,
        schedules: [{ startTime: '09:00', defaultCapacity: 10 }],
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(6)).rejects.toThrow(
        '[ExperienceRepository] Daily Tour #6 is missing required price in EGP.'
      )
    })

    it('should throw explicit domain error if daily_tour is missing durationMinutes', async () => {
      const doc = {
        id: 60,
        title: 'Missing Duration Minutes Tour',
        slug: 'missing-duration-minutes-tour',
        type: 'daily_tour',
        city: { id: 10 },
        availability: 'available',
        duration: {},
        price: 1500,
        schedules: [{ startTime: '09:00', defaultCapacity: 10 }],
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(60)).rejects.toThrow(
        '[ExperienceRepository] Daily Tour #60 is missing required duration.durationMinutes (must be >= 15 minutes).'
      )
    })

    it('should throw explicit error if price is negative', async () => {
      const doc = {
        id: 7,
        title: 'Negative Price Tour',
        slug: 'negative-price-tour',
        type: 'package',
        city: { id: 10 },
        availability: 'available',
        duration: { days: 2 },
        price: -500,
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(7)).rejects.toThrow(
        '[ExperienceRepository] Experience #7 has invalid negative price: -500.'
      )
    })
  })

  describe('Daily Tour Schedules & Fail-Fast', () => {
    it('should map schedules accurately when provided on an experience', async () => {
      const doc = {
        id: 11,
        title: 'Daily Tour With Schedules',
        slug: 'daily-tour-schedules',
        type: 'daily_tour',
        city: { id: 10 },
        availability: 'available',
        duration: { durationMinutes: 240 },
        price: 1500,
        schedules: [
          { startTime: '09:00', defaultCapacity: 15, label: 'Morning' },
          { startTime: '14:00', defaultCapacity: 20, label: 'Afternoon' },
        ],
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      const aggregate = await repo.findById(11)

      expect(aggregate.schedules).toHaveLength(2)
      expect(aggregate.schedules?.[0]).toEqual({
        startTime: '09:00',
        defaultCapacity: 15,
        label: 'Morning',
      })
    })

    it('should throw explicit error if schedule is missing startTime or has invalid defaultCapacity', async () => {
      const doc = {
        id: 12,
        title: 'Corrupt Schedule Tour',
        slug: 'corrupt-schedule-tour',
        type: 'daily_tour',
        city: { id: 10 },
        availability: 'available',
        duration: { durationMinutes: 240 },
        price: 1500,
        schedules: [{ startTime: '09:00', defaultCapacity: 0 }],
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      await expect(repo.findById(12)).rejects.toThrow(
        '[ExperienceRepository] Experience #12 schedule for 09:00 has invalid defaultCapacity (must be >= 1).'
      )
    })
  })

  describe('Hero & Gallery Media Mapping', () => {
    it('should map heroUrl from upload object without external mock fallback', async () => {
      const doc = {
        id: 8,
        title: 'Red Sea Diving',
        slug: 'red-sea-diving',
        type: 'daily_tour',
        city: { id: 20 },
        availability: 'available',
        duration: { durationMinutes: 240 },
        price: 3000,
        schedules: [{ startTime: '09:00', defaultCapacity: 12 }],
        hero: {
          url: '/media/red-sea-hero.jpg',
        },
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      const aggregate = await repo.findById(8)

      expect(aggregate.heroUrl).toBe('/media/red-sea-hero.jpg')
    })

    it('should set heroUrl to undefined when hero is absent (no external unsplash URL)', async () => {
      const doc = {
        id: 9,
        title: 'Oasis Trek',
        slug: 'oasis-trek',
        type: 'daily_tour',
        city: { id: 20 },
        availability: 'available',
        duration: { durationMinutes: 240 },
        price: 2500,
        schedules: [{ startTime: '07:00', defaultCapacity: 8 }],
      }

      const repo = new ExperienceRepository(createMockPayload(doc) as any)
      const aggregate = await repo.findById(9)

      expect(aggregate.heroUrl).toBeUndefined()
    })
  })

  describe('DepartureSlot Mapping & Fail-Fast', () => {
    it('should map departure slot entity with exact priceOverrideEGP and capacities', async () => {
      const mockSlotDoc = {
        id: 101,
        departureId: 'DEP-1-2026-10-01-0900',
        experience: { id: 1 },
        date: '2026-10-01T00:00:00.000Z',
        startTime: '09:00',
        priceOverrideEGP: 3500,
        capacityTotal: 15,
        capacityReserved: 2,
        capacitySold: 3,
        capacityAvailable: 10,
        version: 1,
        status: 'available',
      }

      const repo = new ExperienceRepository(createMockPayload(null, [mockSlotDoc]) as any)
      const slot = await repo.getDepartureSlotById(101)

      expect(slot).not.toBeNull()
      expect(slot?.id).toBe(101)
      expect(slot?.priceOverrideEGP).toBe(3500)
      expect(slot?.capacityTotal).toBe(15)
      expect(slot?.capacityAvailable).toBe(10)
    })

    it('should throw explicit error when slot document in database is malformed', async () => {
      const corruptSlotDoc = {
        id: 102,
        departureId: 'DEP-1-CORRUPT',
        experience: null, // Missing experience relation
        date: null,
      }

      const repo = new ExperienceRepository(createMockPayload(null, [corruptSlotDoc]) as any)
      await expect(repo.getDepartureSlotById(102)).rejects.toThrow(
        '[ExperienceRepository] Database slot record 102 is invalid or missing required fields.'
      )
    })
  })
})

