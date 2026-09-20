import { describe, it, expect } from 'vitest'
import {
  RoomAllocationPolicy,
  type RoomAllocationItem,
} from '@/domains/experience/room-allocation-policy'

describe('RoomAllocationPolicy - Domain Unit Tests', () => {
  describe('calculateMinimumRequiredRooms', () => {
    it('calculates 1 room for 1 adult with single/double supported', () => {
      const min = RoomAllocationPolicy.calculateMinimumRequiredRooms({
        adultsCount: 1,
        supportedOccupancies: ['single', 'double'],
      })
      expect(min).toBe(1)
    })

    it('calculates 2 rooms for 5 adults when Quad is supported (ceil(5/4) = 2)', () => {
      const min = RoomAllocationPolicy.calculateMinimumRequiredRooms({
        adultsCount: 5,
        supportedOccupancies: ['single', 'double', 'triple', 'quad'],
      })
      expect(min).toBe(2)
    })

    it('calculates 3 rooms for 5 adults when only Double is supported (ceil(5/2) = 3)', () => {
      const min = RoomAllocationPolicy.calculateMinimumRequiredRooms({
        adultsCount: 5,
        supportedOccupancies: ['single', 'double'],
      })
      expect(min).toBe(3)
    })

    it('calculates 5 rooms for 5 adults when only Single is supported', () => {
      const min = RoomAllocationPolicy.calculateMinimumRequiredRooms({
        adultsCount: 5,
        supportedOccupancies: ['single'],
      })
      expect(min).toBe(5)
    })
  })

  describe('resolveSmartAllocation (Legacy Baseline Preservation)', () => {
    it('returns single room for 1 adult', () => {
      const res = RoomAllocationPolicy.resolveSmartAllocation({
        adultsCount: 1,
        supportedOccupancies: ['single', 'double', 'triple'],
      })
      expect(res.valid).toBe(true)
      expect(res.allocation).toHaveLength(1)
      expect(res.allocation?.[0]).toEqual({
        roomIndex: 1,
        occupancy: 'single',
        adults: 1,
        children: 0,
      })
    })

    it('returns double room for 2 adults', () => {
      const res = RoomAllocationPolicy.resolveSmartAllocation({
        adultsCount: 2,
        supportedOccupancies: ['single', 'double', 'triple'],
      })
      expect(res.valid).toBe(true)
      expect(res.allocation).toHaveLength(1)
      expect(res.allocation?.[0]).toEqual({
        roomIndex: 1,
        occupancy: 'double',
        adults: 2,
        children: 0,
      })
    })

    it('auto-adjusts when requestedRooms is insufficient for group size', () => {
      const res = RoomAllocationPolicy.resolveSmartAllocation({
        adultsCount: 6,
        requestedRooms: 1,
        supportedOccupancies: ['single', 'double', 'triple'],
      })
      expect(res.valid).toBe(true)
      expect(res.autoAdjusted).toBe(true)
      expect(res.allocation?.length).toBeGreaterThanOrEqual(2)
    })

    it('fails when adults count is 0', () => {
      const res = RoomAllocationPolicy.resolveSmartAllocation({
        adultsCount: 0,
        supportedOccupancies: ['single', 'double'],
      })
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('At least one adult traveler is required')
    })
  })

  describe('getValidAllocationOptions', () => {
    it('generates deterministic valid options for 5 adults with all occupancies supported', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 5,
        supportedOccupancies: ['single', 'double', 'triple', 'quad'],
      })

      expect(options.length).toBeGreaterThan(0)

      // Verify every generated option satisfies invariants
      options.forEach((opt) => {
        expect(opt.id).toBeDefined()
        expect(typeof opt.id).toBe('string')
        expect(opt.roomCount).toBe(opt.rooms.length)
        expect(opt.roomCount).toBeGreaterThanOrEqual(2) // min rooms for 5 adults with quad
        expect(opt.roomCount).toBeLessThanOrEqual(5) // max rooms is 5

        const totalAdults = opt.rooms.reduce((sum, r) => sum + r.adults, 0)
        expect(totalAdults).toBe(5)

        opt.rooms.forEach((r) => {
          expect(r.adults).toBeGreaterThanOrEqual(1)
          expect(['single', 'double', 'triple', 'quad']).toContain(r.occupancy)
        })
      })

      // Verify canonical IDs exist
      const optionIds = options.map((o) => o.id)
      expect(optionIds).toContain('1xtriple+1xdouble')
      expect(optionIds).toContain('1xquad+1xsingle')
      expect(optionIds).toContain('2xdouble+1xsingle')
    })

    it('does not generate quad rooms when quad is not in supportedOccupancies', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 4,
        supportedOccupancies: ['single', 'double', 'triple'],
      })

      options.forEach((opt) => {
        opt.rooms.forEach((r) => {
          expect(r.occupancy).not.toBe('quad')
        })
      })

      const optionIds = options.map((o) => o.id)
      expect(optionIds).toContain('2xdouble')
      expect(optionIds).toContain('1xtriple+1xsingle')
      expect(optionIds).not.toContain('1xquad')
    })

    it('distributes children correctly across rooms without exceeding capacity', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 4,
        childrenCount: 2,
        supportedOccupancies: ['single', 'double', 'triple'],
      })

      options.forEach((opt) => {
        const totalChildren = opt.rooms.reduce((sum, r) => sum + r.children, 0)
        expect(totalChildren).toBe(2)
        opt.rooms.forEach((r) => {
          expect(r.children).toBeLessThanOrEqual(1)
        })
      })
    })

    it('returns empty array if adultsCount is 0', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 0,
        supportedOccupancies: ['single', 'double'],
      })
      expect(options).toEqual([])
    })

    it('ensures EVERY generated option strictly passes validateCustomAllocation without errors', () => {
      const testCases = [
        { adults: 1, children: 0, supported: ['single', 'double'] as const },
        { adults: 2, children: 0, supported: ['single', 'double'] as const },
        { adults: 2, children: 1, supported: ['double', 'triple'] as const },
        { adults: 3, children: 0, supported: ['single', 'double', 'triple'] as const },
        { adults: 4, children: 1, supported: ['single', 'double', 'triple', 'quad'] as const },
        { adults: 5, children: 2, supported: ['single', 'double', 'triple', 'quad'] as const },
        { adults: 6, children: 2, supported: ['double', 'triple', 'quad'] as const },
      ]

      testCases.forEach(({ adults, children, supported }) => {
        const options = RoomAllocationPolicy.getValidAllocationOptions({
          adultsCount: adults,
          childrenCount: children,
          supportedOccupancies: [...supported],
        })

        options.forEach((opt) => {
          const validation = RoomAllocationPolicy.validateCustomAllocation({
            allocation: opt.rooms,
            adultsCount: adults,
            childrenCount: children,
            supportedOccupancies: [...supported],
          })
          expect(validation.valid).toBe(true)
          expect(validation.errors).toHaveLength(0)
        })
      })
    })

    it('places recommended option at index 0 and sorts remaining options deterministically', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 5,
        supportedOccupancies: ['single', 'double', 'triple', 'quad'],
      })

      expect(options[0].isRecommended).toBe(true)
      expect(options[0].id).toBe('1xtriple+1xdouble')

      const rest = options.slice(1)
      for (let i = 0; i < rest.length - 1; i++) {
        const current = rest[i]
        const next = rest[i + 1]
        if (current.roomCount === next.roomCount) {
          expect(current.id.localeCompare(next.id)).toBeLessThanOrEqual(0)
        } else {
          expect(current.roomCount).toBeLessThan(next.roomCount)
        }
      }
    })
  })

  describe('validateCustomAllocation', () => {
    const supported: ('single' | 'double' | 'triple' | 'quad')[] = [
      'single',
      'double',
      'triple',
      'quad',
    ]

    it('validates a correct custom allocation for 5 adults (1 Triple + 1 Double)', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'triple', adults: 3, children: 0 },
        { roomIndex: 2, occupancy: 'double', adults: 2, children: 0 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 5,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
      expect(res.allocation).toHaveLength(2)
    })

    it('rejects double room exceeding total capacity (2 adults + 1 child = 3 guests > 2)', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'double', adults: 2, children: 1 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 2,
        childrenCount: 1,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('exceeds total maximum capacity of 2 guests'))).toBe(true)
    })

    it('rejects triple room exceeding total capacity (3 adults + 1 child = 4 guests > 3)', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'triple', adults: 3, children: 1 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 3,
        childrenCount: 1,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('exceeds total maximum capacity of 3 guests'))).toBe(true)
    })

    it('rejects quad room exceeding total capacity (4 adults + 1 child = 5 guests > 4)', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'quad', adults: 4, children: 1 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 4,
        childrenCount: 1,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('exceeds total maximum capacity of 4 guests'))).toBe(true)
    })

    it('rejects quad room exceeding total capacity (3 adults + 2 children = 5 guests > 4)', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'quad', adults: 3, children: 2 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 3,
        childrenCount: 2,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('exceeds total maximum capacity of 4 guests'))).toBe(true)
    })

    it('rejects single room exceeding total capacity (1 adult + 1 child = 2 guests > 1)', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'single', adults: 1, children: 1 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 1,
        childrenCount: 1,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('exceeds total maximum capacity of 1 guests'))).toBe(true)
    })

    it('accepts valid mixed configurations within capacity limits', () => {
      // Double: 1 adult + 1 child = 2 guests
      const resDouble = RoomAllocationPolicy.validateCustomAllocation({
        allocation: [{ roomIndex: 1, occupancy: 'double', adults: 1, children: 1 }],
        adultsCount: 1,
        childrenCount: 1,
        supportedOccupancies: supported,
      })
      expect(resDouble.valid).toBe(true)

      // Triple: 2 adults + 1 child = 3 guests
      const resTriple = RoomAllocationPolicy.validateCustomAllocation({
        allocation: [{ roomIndex: 1, occupancy: 'triple', adults: 2, children: 1 }],
        adultsCount: 2,
        childrenCount: 1,
        supportedOccupancies: supported,
      })
      expect(resTriple.valid).toBe(true)

      // Quad: 2 adults + 2 children = 4 guests
      const resQuad = RoomAllocationPolicy.validateCustomAllocation({
        allocation: [{ roomIndex: 1, occupancy: 'quad', adults: 2, children: 2 }],
        adultsCount: 2,
        childrenCount: 2,
        supportedOccupancies: supported,
      })
      expect(resQuad.valid).toBe(true)

      // Quad: 3 adults + 1 child = 4 guests
      const resQuad3 = RoomAllocationPolicy.validateCustomAllocation({
        allocation: [{ roomIndex: 1, occupancy: 'quad', adults: 3, children: 1 }],
        adultsCount: 3,
        childrenCount: 1,
        supportedOccupancies: supported,
      })
      expect(resQuad3.valid).toBe(true)
    })

    it('rejects allocation when total adults do not match requested headcount', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'triple', adults: 3, children: 0 },
        { roomIndex: 2, occupancy: 'double', adults: 1, children: 0 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 5,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('does not match requested adults'))).toBe(true)
    })

    it('rejects allocation when adults in a room exceed room capacity', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'double', adults: 3, children: 0 }, // double max 2
        { roomIndex: 2, occupancy: 'double', adults: 2, children: 0 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 5,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('cannot accommodate 3 adults'))).toBe(true)
    })

    it('rejects room without at least 1 adult', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'double', adults: 0, children: 1 },
        { roomIndex: 2, occupancy: 'quad', adults: 4, children: 0 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 4,
        childrenCount: 1,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('must contain at least 1 adult'))).toBe(true)
    })

    it('rejects unsupported occupancy', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'quad', adults: 4, children: 0 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 4,
        supportedOccupancies: ['single', 'double', 'triple'], // quad not supported
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('unsupported occupancy "quad"'))).toBe(true)
    })

    it('rejects empty allocation array', () => {
      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: [],
        adultsCount: 2,
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors[0]).toBe('Room allocation cannot be empty.')
    })

    it('rejects when more rooms than adults are allocated', () => {
      const custom: RoomAllocationItem[] = [
        { roomIndex: 1, occupancy: 'single', adults: 1, children: 0 },
        { roomIndex: 2, occupancy: 'single', adults: 1, children: 0 },
        { roomIndex: 3, occupancy: 'single', adults: 1, children: 0 },
      ]

      const res = RoomAllocationPolicy.validateCustomAllocation({
        allocation: custom,
        adultsCount: 2, // only 2 adults but 3 rooms
        supportedOccupancies: supported,
      })

      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.includes('Each room must contain at least 1 adult'))).toBe(true)
    })
  })

  describe('2 Guests Isolation Tests (No Room Stepper Conflict)', () => {
    it('generates 1 Double and 2 Singles for 2 adults when both single and double are supported', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 2,
        supportedOccupancies: ['single', 'double'],
      })

      const optionIds = options.map((o) => o.id)
      expect(optionIds).toContain('1xdouble')
      expect(optionIds).toContain('2xsingle')

      const recommended = RoomAllocationPolicy.getRecommendedAllocationOption(options)
      expect(recommended?.id).toBe('1xdouble')
      expect(recommended?.isRecommended).toBe(true)
      expect(recommended?.rooms).toHaveLength(1)
      expect(recommended?.rooms[0].adults).toBe(2)
    })

    it('generates 1 Double and 1 Triple for 2 adults when single is not supported', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 2,
        supportedOccupancies: ['double', 'triple'],
      })

      const optionIds = options.map((o) => o.id)
      expect(optionIds).toContain('1xdouble')
      expect(optionIds).toContain('1xtriple')
      expect(optionIds).not.toContain('2xsingle')
      expect(options).toHaveLength(2)

      const recommended = RoomAllocationPolicy.getRecommendedAllocationOption(options)
      expect(recommended?.id).toBe('1xdouble')
    })
  })

  describe('5 Adults Combinations & Repetitive Allocations Suite', () => {
    it('generates all expected combinations for 5 adults when quad, triple, double, single are supported', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 5,
        supportedOccupancies: ['quad', 'triple', 'double', 'single'],
      })

      const optionIds = options.map((o) => o.id)

      // 1. 5 Single Rooms (5 rooms)
      expect(optionIds).toContain('5xsingle')
      const fiveSingles = options.find((o) => o.id === '5xsingle')
      expect(fiveSingles?.roomCount).toBe(5)
      expect(fiveSingles?.rooms.every((r) => r.occupancy === 'single' && r.adults === 1)).toBe(true)

      // 2. 1 Double + 3 Singles (4 rooms)
      expect(optionIds).toContain('1xdouble+3xsingle')
      const doubleThreeSingles = options.find((o) => o.id === '1xdouble+3xsingle')
      expect(doubleThreeSingles?.roomCount).toBe(4)

      // 3. 2 Doubles + 1 Single (3 rooms)
      expect(optionIds).toContain('2xdouble+1xsingle')
      const twoDoublesOneSingle = options.find((o) => o.id === '2xdouble+1xsingle')
      expect(twoDoublesOneSingle?.roomCount).toBe(3)

      // 4. 1 Triple + 2 Singles (3 rooms)
      expect(optionIds).toContain('1xtriple+2xsingle')
      const tripleTwoSingles = options.find((o) => o.id === '1xtriple+2xsingle')
      expect(tripleTwoSingles?.roomCount).toBe(3)

      // 5. 1 Triple + 1 Double (2 rooms - Recommended)
      expect(optionIds).toContain('1xtriple+1xdouble')
      const tripleDouble = options.find((o) => o.id === '1xtriple+1xdouble')
      expect(tripleDouble?.roomCount).toBe(2)
      expect(tripleDouble?.isRecommended).toBe(true)

      // 6. 1 Quad + 1 Single (2 rooms)
      expect(optionIds).toContain('1xquad+1xsingle')
      const quadSingle = options.find((o) => o.id === '1xquad+1xsingle')
      expect(quadSingle?.roomCount).toBe(2)

      // Recommended helper check
      const rec = RoomAllocationPolicy.getRecommendedAllocationOption(options)
      expect(rec?.id).toBe('1xtriple+1xdouble')
      expect(options[0].id).toBe('1xtriple+1xdouble')
    })

    it('does NOT generate 5xsingle when single is not in supportedOccupancies for 5 adults', () => {
      const options = RoomAllocationPolicy.getValidAllocationOptions({
        adultsCount: 5,
        supportedOccupancies: ['quad', 'triple', 'double'],
      })

      const optionIds = options.map((o) => o.id)
      expect(optionIds).not.toContain('5xsingle')
      expect(optionIds).not.toContain('1xquad+1xsingle')
      expect(optionIds).not.toContain('2xdouble+1xsingle')
      expect(optionIds).toContain('1xtriple+1xdouble')
    })
  })
})
