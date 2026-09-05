import { describe, it, expect } from 'vitest'
import { AccommodationPolicy } from '@/domains/experience/accommodation-policy'
import {
  mapExperienceDocToAggregate,
  mapExperienceDocToOperationalMetadata,
} from '@/domains/experience/repository/experience-mapper'
import type { AccommodationStayEntity } from '@/domains/experience/types'

describe('GATE 5.1R.4: Accommodation Read-Boundary & Schema Cleanup Unit Tests', () => {
  const basePackageDoc = {
    id: 101,
    title: 'Cairo & Nile Explorer',
    slug: 'cairo-nile-explorer',
    type: 'package' as const,
    city: 1,
    availability: 'available' as const,
    price: 12500,
    duration: {
      days: 5,
      nights: 4,
    },
    itinerary: [
      { dayNumber: 1, title: 'Arrival', description: 'Welcome to Cairo' },
    ],
    isActive: true,
  }

  const baseDailyTourDoc = {
    id: 202,
    title: 'Giza Pyramids Half-Day Tour',
    slug: 'giza-pyramids-half-day',
    type: 'daily_tour' as const,
    city: 1,
    availability: 'available' as const,
    price: 1500,
    duration: {
      durationMinutes: 240,
    },
    isActive: true,
  }

  const validOccupancyOptions = [
    {
      occupancy: 'single',
      supplementEGP: 3500,
      isDefault: false,
    },
    {
      occupancy: 'double',
      supplementEGP: 0,
      isDefault: true,
    },
    {
      occupancy: 'triple',
      supplementEGP: 1500,
      isDefault: false,
    },
  ]

  describe('1. Backward Compatibility (Zero Stays)', () => {
    it('Package with zero accommodation stays maps cleanly and sets accommodations to undefined', () => {
      const aggregate = mapExperienceDocToAggregate(basePackageDoc)
      expect(aggregate.type).toBe('package')
      if (aggregate.type === 'package') {
        expect(aggregate.accommodations).toBeUndefined()
        expect(aggregate.durationDays).toBe(5)
      }
    })

    it('Package with empty accommodations array maps cleanly without errors', () => {
      const docWithEmpty = { ...basePackageDoc, accommodations: [] }
      const aggregate = mapExperienceDocToAggregate(docWithEmpty)
      if (aggregate.type === 'package') {
        expect(aggregate.accommodations).toBeUndefined()
      }
    })
  })

  describe('2. Single & Multi-Stay Mapping with Reusable Property & Derived Guest Count', () => {
    it('Package with 1 accommodation stay maps property relationship and derives guestCount cleanly', () => {
      const docWithOneStay = {
        ...basePackageDoc,
        accommodations: [
          {
            order: 1,
            property: {
              id: 10,
              name: 'Four Seasons Hotel Cairo at Nile Plaza',
              slug: 'four-seasons-cairo-nile-plaza',
              type: 'hotel',
              city: 1,
              rating: 5,
              isActive: true,
            },
            nights: 4,
            roomCategory: 'Deluxe Nile View Room',
            boardBasis: 'bed_and_breakfast',
            occupancyOptions: validOccupancyOptions,
          },
        ],
      }

      const aggregate = mapExperienceDocToAggregate(docWithOneStay)
      expect(aggregate.type).toBe('package')
      if (aggregate.type === 'package') {
        expect(aggregate.accommodations).toBeDefined()
        expect(aggregate.accommodations).toHaveLength(1)
        const stay = aggregate.accommodations![0]
        expect(stay.order).toBe(1)
        expect(stay.propertyId).toBe(10)
        expect(stay.property).toBeDefined()
        expect(stay.property?.name).toBe('Four Seasons Hotel Cairo at Nile Plaza')
        expect(stay.property?.type).toBe('hotel')
        expect(stay.property?.rating).toBe(5)
        expect(stay.nights).toBe(4)
        expect(stay.roomCategory).toBe('Deluxe Nile View Room')
        expect(stay.boardBasis).toBe('bed_and_breakfast')
        expect(stay.occupancyOptions).toHaveLength(3)
        expect(stay.occupancyOptions[0].occupancy).toBe('single')
        expect(stay.occupancyOptions[0].guestCount).toBe(1) // Derived automatically
        expect(stay.occupancyOptions[0].supplementEGP).toBe(3500)
        expect(stay.occupancyOptions[1].occupancy).toBe('double')
        expect(stay.occupancyOptions[1].guestCount).toBe(2) // Derived automatically
        expect(stay.occupancyOptions[1].isDefault).toBe(true)
        expect(stay.occupancyOptions[2].occupancy).toBe('triple')
        expect(stay.occupancyOptions[2].guestCount).toBe(3) // Derived automatically
      }
    })

    it('Package with multiple accommodation stays sorts deterministically by order ascending', () => {
      const docWithMultipleStays = {
        ...basePackageDoc,
        accommodations: [
          {
            order: 2,
            property: 20,
            nights: 2,
            boardBasis: 'full_board',
            occupancyOptions: validOccupancyOptions,
          },
          {
            order: 1,
            property: 10,
            nights: 2,
            boardBasis: 'bed_and_breakfast',
            occupancyOptions: validOccupancyOptions,
          },
        ],
      }

      const aggregate = mapExperienceDocToAggregate(docWithMultipleStays)
      if (aggregate.type === 'package') {
        expect(aggregate.accommodations).toBeDefined()
        expect(aggregate.accommodations).toHaveLength(2)
        expect(aggregate.accommodations![0].order).toBe(1)
        expect(aggregate.accommodations![0].propertyId).toBe(10)
        expect(aggregate.accommodations![1].order).toBe(2)
        expect(aggregate.accommodations![1].propertyId).toBe(20)
      }
    })
  })

  describe('3. Read-Boundary Separation (Operational Metadata vs Strict Aggregate Hydration)', () => {
    const legacyCorruptPackageDoc = {
      ...basePackageDoc,
      id: 693,
      accommodations: [
        {
          order: 1,
          propertyName: 'Legacy Hotel Name with no property ID and no occupancy',
          nights: 3,
          // Missing propertyId and missing occupancyOptions
        },
      ],
    }

    it('mapExperienceDocToOperationalMetadata maps operational fields without touching corrupt accommodations', () => {
      const meta = mapExperienceDocToOperationalMetadata(legacyCorruptPackageDoc)
      expect(meta.id).toBe(693)
      expect(meta.title).toBe('Cairo & Nile Explorer')
      expect(meta.cityId).toBe(1)
      expect(meta.durationDays).toBe(5)
      expect(meta.price).toBe(12500)
      expect(meta.type).toBe('package')
      // Verified: Slot actions get operational metadata and never crash
    })

    it('mapExperienceDocToAggregate STRICTLY throws on corrupt accommodations when full aggregate is requested', () => {
      expect(() => mapExperienceDocToAggregate(legacyCorruptPackageDoc)).toThrowError(
        /Package #693 accommodation validation failed/,
      )
    })
  })

  describe('4. Fail-Fast Package-Only Invariant Enforcement', () => {
    it('Daily Tour rejects accommodation configuration explicitly at mapper level', () => {
      const dailyTourWithStay = {
        ...baseDailyTourDoc,
        accommodations: [
          {
            order: 1,
            property: 10,
            nights: 1,
            occupancyOptions: validOccupancyOptions,
          },
        ],
      }

      expect(() => mapExperienceDocToAggregate(dailyTourWithStay)).toThrowError(
        /Daily Tour #202 cannot contain accommodation stays/,
      )
    })

    it('AccommodationPolicy directly rejects accommodation stays for daily_tour', () => {
      const res = AccommodationPolicy.validate('daily_tour', [
        {
          order: 1,
          property: 10,
          nights: 1,
          occupancyOptions: validOccupancyOptions,
        },
      ])

      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('Daily Tours cannot contain accommodation stays')
    })
  })

  describe('5. Occupancy Options Invariant Validations (Exactly-One Default & No Duplicates)', () => {
    it('rejects stay with duplicate occupancy options', () => {
      const duplicateOccupancyStay = {
        ...basePackageDoc,
        accommodations: [
          {
            order: 1,
            property: 10,
            nights: 2,
            occupancyOptions: [
              { occupancy: 'double', supplementEGP: 0, isDefault: true },
              { occupancy: 'double', supplementEGP: 500, isDefault: false },
            ],
          },
        ],
      }

      expect(() => mapExperienceDocToAggregate(duplicateOccupancyStay)).toThrowError(
        /contains duplicate occupancy option: "double"/,
      )
    })

    it('rejects stay with zero default occupancy options (No silent fallback to double)', () => {
      const zeroDefaultsStay = {
        ...basePackageDoc,
        accommodations: [
          {
            order: 1,
            property: 10,
            nights: 2,
            occupancyOptions: [
              { occupancy: 'single', supplementEGP: 3000, isDefault: false },
              { occupancy: 'double', supplementEGP: 0, isDefault: false },
            ],
          },
        ],
      }

      expect(() => mapExperienceDocToAggregate(zeroDefaultsStay)).toThrowError(
        /has no default occupancy option. Exactly one option must have isDefault === true/,
      )
    })

    it('rejects stay with multiple default occupancy options', () => {
      const multipleDefaultsStay = {
        ...basePackageDoc,
        accommodations: [
          {
            order: 1,
            property: 10,
            nights: 2,
            occupancyOptions: [
              { occupancy: 'single', supplementEGP: 3000, isDefault: true },
              { occupancy: 'double', supplementEGP: 0, isDefault: true },
            ],
          },
        ],
      }

      expect(() => mapExperienceDocToAggregate(multipleDefaultsStay)).toThrowError(
        /has 2 default occupancy options. Exactly one option must have isDefault === true/,
      )
    })

    it('rejects stay with negative supplementEGP', () => {
      const negativeSupplementStay = {
        ...basePackageDoc,
        accommodations: [
          {
            order: 1,
            property: 10,
            nights: 2,
            occupancyOptions: [
              { occupancy: 'single', supplementEGP: -500, isDefault: true },
            ],
          },
        ],
      }

      expect(() => mapExperienceDocToAggregate(negativeSupplementStay)).toThrowError(
        /has invalid supplementEGP: -500 \(must be >= 0\)/,
      )
    })

    it('rejects stay with missing or invalid property reference', () => {
      const missingPropertyStay = {
        ...basePackageDoc,
        accommodations: [
          {
            order: 1,
            property: 0,
            nights: 2,
            occupancyOptions: validOccupancyOptions,
          },
        ],
      }

      expect(() => mapExperienceDocToAggregate(missingPropertyStay)).toThrowError(
        /missing valid property reference/,
      )
    })

    it('rejects stay with zero or negative nights', () => {
      const invalidNightsStay = {
        ...basePackageDoc,
        accommodations: [
          {
            order: 1,
            property: 10,
            nights: 0,
            occupancyOptions: validOccupancyOptions,
          },
        ],
      }

      expect(() => mapExperienceDocToAggregate(invalidNightsStay)).toThrowError(
        /has invalid nights: 0 \(must be integer >= 1\)/,
      )
    })
  })
})
