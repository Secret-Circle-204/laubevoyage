import { describe, it, expect } from 'vitest'
import { AccommodationPolicy } from '@/domains/experience/accommodation-policy'
import { mapExperienceDocToAggregate } from '@/domains/experience/repository/experience-mapper'

describe('AccommodationPolicy Domain Suite', () => {
  const buildValidOption = (overrides?: Record<string, any>) => ({
    id: 'opt_1',
    property: 101,
    roomCategory: 'Deluxe Sea View',
    boardBasis: 'all_inclusive',
    pricingUnit: 'per_stay',
    roomRates: [
      { occupancy: 'single', rateEGP: 5000, enabled: true },
      { occupancy: 'double', rateEGP: 8000, enabled: true },
    ],
    ...overrides,
  })

  const buildValidStay = (overrides?: Record<string, any>) => ({
    id: 'stay_1',
    order: 1,
    nights: 3,
    options: [buildValidOption()],
    ...overrides,
  })

  describe('Valid Accommodation Configurations', () => {
    it('1. accepts a stay with exactly one option', () => {
      const stays = [buildValidStay()]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('2. accepts a stay with multiple distinct hotel options', () => {
      const stays = [
        buildValidStay({
          options: [
            buildValidOption({ id: 'opt_1', property: 101, roomCategory: 'Rixos Premium' }),
            buildValidOption({ id: 'opt_2', property: 102, roomCategory: 'Bella Vista Resort' }),
            buildValidOption({ id: 'opt_3', property: 103, roomCategory: 'Steigenberger Al Dau' }),
          ],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('3. accepts option with valid room rates across all occupancies', () => {
      const stays = [
        buildValidStay({
          options: [
            buildValidOption({
              roomRates: [
                { occupancy: 'single', rateEGP: 3000, enabled: true },
                { occupancy: 'double', rateEGP: 5000, enabled: true },
                { occupancy: 'triple', rateEGP: 7000, enabled: true },
                { occupancy: 'quad', rateEGP: 9000, enabled: true },
              ],
            }),
          ],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('4. accepts option with valid per_stay pricing', () => {
      const stays = [
        buildValidStay({
          options: [buildValidOption({ pricingUnit: 'per_stay' })],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('5. accepts option with valid per_night pricing', () => {
      const stays = [
        buildValidStay({
          options: [buildValidOption({ pricingUnit: 'per_night' })],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('6. accepts transitional legacy single-hotel stay shape during development', () => {
      const legacyStay = {
        order: 1,
        nights: 4,
        property: 201,
        roomCategory: 'Standard Garden',
        boardBasis: 'half_board',
        pricingUnit: 'per_night',
        roomRates: [{ occupancy: 'double', rateEGP: 4000, enabled: true }],
      }
      const result = AccommodationPolicy.validate('package', [legacyStay])
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('7. allows empty accommodations array on packages (packages without lodging)', () => {
      const result = AccommodationPolicy.validate('package', [])
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Invalid Stay Invariants', () => {
    it('8. rejects stay with zero options (empty options array)', () => {
      const stays = [buildValidStay({ options: [] })]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('must contain at least one accommodation option in options[]'))).toBe(
        true,
      )
    })

    it('9. rejects stay with invalid nights (0 or negative)', () => {
      const stays = [buildValidStay({ nights: 0 })]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('has invalid nights: 0'))).toBe(true)
    })

    it('10. rejects stay with invalid order (0, negative, or non-integer)', () => {
      const stays = [buildValidStay({ order: 0 })]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('has invalid order: 0'))).toBe(true)
    })

    it('11. rejects daily tours containing accommodations', () => {
      const stays = [buildValidStay()]
      const result = AccommodationPolicy.validate('daily_tour', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Daily Tours cannot contain accommodation stays'))).toBe(true)
    })
  })

  describe('Invalid Option Invariants', () => {
    it('12. rejects option with missing or invalid property reference', () => {
      const stays = [
        buildValidStay({
          options: [buildValidOption({ property: undefined, propertyId: undefined })],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('is missing valid property reference'))).toBe(true)
    })

    it('13. rejects option with no room rates (empty array)', () => {
      const stays = [
        buildValidStay({
          options: [buildValidOption({ roomRates: [] })],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('must contain at least one room rate configuration'))).toBe(true)
    })

    it('14. rejects option where all room rates are disabled (enabled === false)', () => {
      const stays = [
        buildValidStay({
          options: [
            buildValidOption({
              roomRates: [
                { occupancy: 'single', rateEGP: 3000, enabled: false },
                { occupancy: 'double', rateEGP: 5000, enabled: false },
              ],
            }),
          ],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('has no enabled room rates'))).toBe(true)
    })

    it('15. rejects duplicate property within the same Stay', () => {
      const stays = [
        buildValidStay({
          options: [
            buildValidOption({ id: 'opt_1', property: 101, roomCategory: 'Standard' }),
            buildValidOption({ id: 'opt_2', property: 101, roomCategory: 'Deluxe' }), // Duplicate property 101
          ],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('contains duplicate property #101 across multiple options'))).toBe(
        true,
      )
    })

    it('16. permits the same property across different Stays (sequential stages)', () => {
      const stays = [
        buildValidStay({
          order: 1,
          nights: 2,
          options: [buildValidOption({ property: 101 })],
        }),
        buildValidStay({
          order: 2,
          nights: 3,
          options: [buildValidOption({ property: 101 })], // Same property in Stay 2 is valid
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('17. rejects duplicate occupancy within the same Option', () => {
      const stays = [
        buildValidStay({
          options: [
            buildValidOption({
              roomRates: [
                { occupancy: 'double', rateEGP: 4000, enabled: true },
                { occupancy: 'double', rateEGP: 5500, enabled: true }, // Duplicate double
              ],
            }),
          ],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('contains duplicate room rate for occupancy: "double"'))).toBe(true)
    })

    it('18. rejects invalid pricingUnit', () => {
      const stays = [
        buildValidStay({
          options: [buildValidOption({ pricingUnit: 'per_hour' })],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('has invalid pricingUnit: "per_hour"'))).toBe(true)
    })

    it('19. rejects invalid boardBasis', () => {
      const stays = [
        buildValidStay({
          options: [buildValidOption({ boardBasis: 'champagne_inclusive' })],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('has invalid boardBasis: "champagne_inclusive"'))).toBe(true)
    })

    it('20. rejects negative room rateEGP', () => {
      const stays = [
        buildValidStay({
          options: [
            buildValidOption({
              roomRates: [{ occupancy: 'single', rateEGP: -500, enabled: true }],
            }),
          ],
        }),
      ]
      const result = AccommodationPolicy.validate('package', stays)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('has invalid rateEGP: -500'))).toBe(true)
    })
  })

  describe('Experience Mapper Integration', () => {
    const mockDoc = {
      id: 99,
      title: 'Grand Egypt & Red Sea Escape',
      slug: 'grand-egypt-red-sea',
      city: 1,
      type: 'package',
      duration: { days: 7, nights: 6 },
      availability: 'available',
      price: 15000,
      accommodations: [
        {
          id: 'stay_cairo',
          order: 1,
          nights: 3,
          options: [
            {
              id: 'opt_marriott',
              property: {
                id: 10,
                name: 'Cairo Marriott Hotel',
                slug: 'cairo-marriott',
                type: 'hotel',
                city: { id: 1, name: 'Cairo' },
                isActive: true,
              },
              roomCategory: 'Deluxe Nile View',
              boardBasis: 'bed_and_breakfast',
              pricingUnit: 'per_stay',
              roomRates: [
                { occupancy: 'single', rateEGP: 6000, enabled: true },
                { occupancy: 'double', rateEGP: 9000, enabled: true },
              ],
            },
            {
              id: 'opt_four_seasons',
              property: {
                id: 11,
                name: 'Four Seasons Cairo',
                slug: 'four-seasons-cairo',
                type: 'hotel',
                city: { id: 1, name: 'Cairo' },
                isActive: true,
              },
              roomCategory: 'Premier Suite',
              boardBasis: 'bed_and_breakfast',
              pricingUnit: 'per_stay',
              roomRates: [
                { occupancy: 'single', rateEGP: 12000, enabled: true },
                { occupancy: 'double', rateEGP: 16000, enabled: true },
              ],
            },
          ],
        },
      ],
    }

    it('21. maps package with new options[] hierarchy and hydrates property entity', () => {
      const aggregate = mapExperienceDocToAggregate(mockDoc as any)
      expect(aggregate.type).toBe('package')
      if (aggregate.type === 'package') {
        expect(aggregate.accommodations).toHaveLength(1)
        const stay = aggregate.accommodations![0]
        expect(stay.order).toBe(1)
        expect(stay.nights).toBe(3)
        expect(stay.options).toHaveLength(2)

        const opt1 = stay.options[0]
        expect(opt1.id).toBe('opt_marriott')
        expect(opt1.propertyId).toBe(10)
        expect(opt1.property?.name).toBe('Cairo Marriott Hotel')
        expect(opt1.property?.cityId).toBe(1)
        expect(opt1.roomCategory).toBe('Deluxe Nile View')
        expect(opt1.pricingUnit).toBe('per_stay')
        expect(opt1.roomRates).toHaveLength(2)

        const opt2 = stay.options[1]
        expect(opt2.id).toBe('opt_four_seasons')
        expect(opt2.propertyId).toBe(11)
        expect(opt2.property?.name).toBe('Four Seasons Cairo')
      }
    })

    it('22. adapts unmigrated legacy single-hotel stay into options[] structure', () => {
      const legacyDoc = {
        id: 100,
        title: 'Classic Nile Cruiser',
        slug: 'classic-nile-cruiser',
        city: 1,
        type: 'package',
        duration: { days: 5, nights: 4 },
        availability: 'available',
        price: 12000,
        accommodations: [
          {
            id: 'legacy_stay_1',
            order: 1,
            nights: 4,
            property: {
              id: 30,
              name: 'Sonesta St. George Cruise',
              slug: 'sonesta-st-george',
              type: 'cruise',
              city: 2,
              isActive: true,
            },
            roomCategory: 'Cabin Main Deck',
            boardBasis: 'full_board',
            pricingUnit: 'per_night',
            roomRates: [{ occupancy: 'double', rateEGP: 4500, enabled: true }],
          },
        ],
      }

      const aggregate = mapExperienceDocToAggregate(legacyDoc as any)
      if (aggregate.type === 'package') {
        expect(aggregate.accommodations).toHaveLength(1)
        const stay = aggregate.accommodations![0]
        expect(stay.order).toBe(1)
        expect(stay.nights).toBe(4)
        expect(stay.options).toHaveLength(1)

        const adaptedOption = stay.options[0]
        expect(adaptedOption.propertyId).toBe(30)
        expect(adaptedOption.property?.name).toBe('Sonesta St. George Cruise')
        expect(adaptedOption.roomCategory).toBe('Cabin Main Deck')
        expect(adaptedOption.boardBasis).toBe('full_board')
        expect(adaptedOption.pricingUnit).toBe('per_night')
        expect(adaptedOption.roomRates).toHaveLength(1)
        expect(adaptedOption.roomRates[0].occupancy).toBe('double')
        expect(adaptedOption.roomRates[0].rateEGP).toBe(4500)
      }
    })
  })
})
