import { describe, it, expect } from 'vitest'
import { BasePriceResolver } from '@/domains/experience/base-price-resolver'
import type { ExperienceAggregate } from '@/domains/experience/aggregate'
import type { DepartureSlotEntity } from '@/domains/experience/types'

describe('Experience Domain: BasePriceResolver Unit Tests', () => {
  const resolver = new BasePriceResolver()

  const createMockExperience = (overrides: Partial<ExperienceAggregate>): ExperienceAggregate => {
    const isPkg = overrides.type === 'package'
    if (isPkg) {
      return {
        id: 1,
        title: 'Test Package',
        slug: 'test-package',
        type: 'package',
        cityId: 101,
        price: 1500,
        availability: 'available',
        duration: { days: 3, nights: 2 },
        durationDays: 3,
        durationNights: 2,
        version: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
      } as ExperienceAggregate
    }
    return {
      id: 1,
      title: 'Test Experience',
      slug: 'test-experience',
      type: 'daily_tour',
      cityId: 101,
      price: 1000,
      availability: 'available',
      duration: { durationMinutes: 180 },
      durationMinutes: 180,
      version: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    } as ExperienceAggregate
  }

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

  describe('Unified Pricing Resolution (priceOverrideEGP ?? experience.price)', () => {
    it('should return slot priceOverrideEGP when present on a package', () => {
      const experience = createMockExperience({ type: 'package', price: 1500 })
      const slot = createMockSlot({ priceOverrideEGP: 2500 })

      const resolvedPrice = resolver.resolve(experience, slot)

      expect(resolvedPrice).toBe(2500)
    })

    it('should return slot priceOverrideEGP when present on a daily tour', () => {
      const experience = createMockExperience({ type: 'daily_tour', price: 1200 })
      const slot = createMockSlot({ priceOverrideEGP: 1600 })

      const resolvedPrice = resolver.resolve(experience, slot)

      expect(resolvedPrice).toBe(1600)
    })

    it('should fall back to experience.price when priceOverrideEGP is missing', () => {
      const experience = createMockExperience({ type: 'package', price: 1500 })
      const slot = createMockSlot({ priceOverrideEGP: undefined })

      const resolvedPrice = resolver.resolve(experience, slot)

      expect(resolvedPrice).toBe(1500)
    })

    it('should fall back to experience.price when slot is null or undefined', () => {
      const experience = createMockExperience({ type: 'daily_tour', price: 1200 })

      const resolvedPrice = resolver.resolve(experience, null)

      expect(resolvedPrice).toBe(1200)
    })

    it('should throw an exception if neither priceOverrideEGP nor experience.price is available', () => {
      const experience = createMockExperience({ id: 99, price: undefined as any })
      const slot = createMockSlot({ id: 5, priceOverrideEGP: undefined })

      expect(() => resolver.resolve(experience, slot)).toThrow(
        '[BasePriceResolver] Experience #99 has no base price and slot #5 has no priceOverrideEGP.'
      )
    })
  })
})
