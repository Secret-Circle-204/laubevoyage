import { describe, it, expect } from 'vitest'
import { BasePriceResolver } from '@/domains/experience/base-price-resolver'
import type { ExperienceAggregate } from '@/domains/experience/aggregate'
import type { DepartureSlotEntity } from '@/domains/experience/types'

describe('Experience Domain: BasePriceResolver Unit Tests', () => {
  const resolver = new BasePriceResolver()

  const createMockExperience = (overrides: Partial<ExperienceAggregate>): ExperienceAggregate => ({
    id: 1,
    title: 'Test Experience',
    slug: 'test-experience',
    type: 'daily_tour',
    cityId: 101,
    basePriceEGP: 1000,
    availability: 'available',
    durationDays: 1,
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  })

  const createMockSlot = (overrides: Partial<DepartureSlotEntity>): DepartureSlotEntity => ({
    departureId: 'slot_1',
    experienceId: 1,
    date: '2026-09-15',
    capacityTotal: 10,
    capacityReserved: 0,
    capacitySold: 0,
    capacityAvailable: 10,
    version: 1,
    status: 'available',
    ...overrides,
  })

  describe('Catalog Pricing Source (daily_tour)', () => {
    it('should return catalog price and ignore slot price override', () => {
      const experience = createMockExperience({ type: 'daily_tour', basePriceEGP: 1500 })
      const slot = createMockSlot({ basePriceEGP: 2000 })

      const resolvedPrice = resolver.resolve(experience, slot)

      expect(resolvedPrice).toBe(1500)
    })

    it('should throw an exception if the catalog price is missing', () => {
      const experience = createMockExperience({ type: 'daily_tour', basePriceEGP: undefined })
      const slot = createMockSlot({ basePriceEGP: 2000 })

      expect(() => resolver.resolve(experience, slot)).toThrow(
        '[BasePriceResolver] Experience 1 is catalog-priced but has no catalog price.'
      )
    })
  })

  describe('Departure Pricing Source (package)', () => {
    it('should return slot override price if present', () => {
      const experience = createMockExperience({ type: 'package', basePriceEGP: 1500 })
      const slot = createMockSlot({ basePriceEGP: 2500 })

      const resolvedPrice = resolver.resolve(experience, slot)

      expect(resolvedPrice).toBe(2500)
    })

    it('should fall back to catalog price if slot price is missing', () => {
      const experience = createMockExperience({ type: 'package', basePriceEGP: 1500 })
      const slot = createMockSlot({ basePriceEGP: undefined })

      const resolvedPrice = resolver.resolve(experience, slot)

      expect(resolvedPrice).toBe(1500)
    })

    it('should throw an exception if both slot and catalog price are missing', () => {
      const experience = createMockExperience({ type: 'package', basePriceEGP: undefined })
      const slot = createMockSlot({ basePriceEGP: undefined })

      expect(() => resolver.resolve(experience, slot)).toThrow(
        '[BasePriceResolver] Experience 1 requires pricing, but neither slot override nor catalog price was found.'
      )
    })
  })
})
