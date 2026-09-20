import { describe, it, expect } from 'vitest'
import {
  RoomAllocationPolicy,
  type OccupancyType,
  type RoomAllocationOption,
} from '@/domains/experience/room-allocation-policy'
import type { AccommodationStayDTO, AccommodationOptionDTO } from '@/application/experience/dto-details'

/**
 * Pure reproduction of the client reconciliation logic from ExperienceDetailsPage.tsx
 * for isolated, deterministic matrix verification.
 */
function resolveSupportedOccupanciesForSelections(
  stays: AccommodationStayDTO[] | undefined,
  selectedOptions: Record<number, string>,
): OccupancyType[] {
  if (!stays || stays.length === 0) {
    return ['single', 'double', 'triple', 'quad']
  }

  const enabledPerStay: Set<OccupancyType>[] = []

  for (const stay of stays) {
    const options = Array.isArray(stay.options) ? stay.options : []
    if (options.length === 0) continue

    let selectedOption: AccommodationOptionDTO | undefined
    if (options.length === 1) {
      selectedOption = options[0]
    } else {
      const selectedId = selectedOptions[stay.order]
      selectedOption = options.find((opt) => opt.id === selectedId)
    }

    if (!selectedOption) {
      continue
    }

    const enabledSet = new Set<OccupancyType>()
    if (Array.isArray(selectedOption.roomRates)) {
      for (const rate of selectedOption.roomRates) {
        if (rate.enabled !== false) {
          enabledSet.add(rate.occupancy as OccupancyType)
        }
      }
    }
    enabledPerStay.push(enabledSet)
  }

  if (enabledPerStay.length === 0) {
    return ['single', 'double', 'triple', 'quad']
  }

  const firstStay = enabledPerStay[0]
  return Array.from(firstStay).filter((occ) =>
    enabledPerStay.every((staySet) => staySet.has(occ)),
  )
}

function reconcileRoomAllocation(params: {
  stays: AccommodationStayDTO[]
  selectedAccommodationOptions: Record<number, string>
  adultsCount: number
  childrenCount: number
  customAllocationId: string | null
}): {
  status: 'valid_recommendation' | 'valid_custom' | 'invalid_custom_requires_adjustment' | 'impossible_configuration'
  allocationToSend: string | undefined
  availableOptions: RoomAllocationOption[]
  activeAllocationId: string | null
  supportedOccupancies: OccupancyType[]
} {
  const supported = resolveSupportedOccupanciesForSelections(
    params.stays,
    params.selectedAccommodationOptions,
  )

  const availableOptions = RoomAllocationPolicy.getValidAllocationOptions({
    adultsCount: params.adultsCount,
    childrenCount: params.childrenCount,
    supportedOccupancies: supported,
  })

  if (availableOptions.length === 0) {
    return {
      status: 'impossible_configuration',
      allocationToSend: undefined,
      availableOptions: [],
      activeAllocationId: null,
      supportedOccupancies: supported,
    }
  }

  const recommendedOption =
    RoomAllocationPolicy.getRecommendedAllocationOption(availableOptions) || availableOptions[0]

  // Scenario A: User has an explicit customized allocation
  if (params.customAllocationId) {
    const isStillValid = availableOptions.some((opt) => opt.id === params.customAllocationId)
    if (isStillValid) {
      return {
        status: 'valid_custom',
        allocationToSend: params.customAllocationId,
        availableOptions,
        activeAllocationId: params.customAllocationId,
        supportedOccupancies: supported,
      }
    } else {
      return {
        status: 'invalid_custom_requires_adjustment',
        allocationToSend: undefined, // Blocked from sending to pricing!
        availableOptions,
        activeAllocationId: params.customAllocationId,
        supportedOccupancies: supported,
      }
    }
  }

  // Scenario B: System Recommendation mode (user has not customized)
  return {
    status: 'valid_recommendation',
    allocationToSend: undefined, // Let pricing resolve the recommended allocation
    availableOptions,
    activeAllocationId: recommendedOption.id,
    supportedOccupancies: supported,
  }
}

// ─── Test Fixture Helpers ───────────────────────────────────────────────────

function createOption(
  id: string,
  propertyName: string,
  occupancies: OccupancyType[],
): AccommodationOptionDTO {
  return {
    id,
    propertyId: 100,
    propertyName,
    propertyType: 'hotel',
    pricingUnit: 'per_night',
    roomRates: occupancies.map((occ) => ({
      occupancy: occ,
      label: occ,
      rateEGP: 1000,
      enabled: true,
    })),
  }
}

const hotelA = createOption('opt-A', 'Hotel A (Triple Enabled)', ['single', 'double', 'triple'])
const hotelB = createOption('opt-B', 'Hotel B (Quad Enabled)', ['single', 'double', 'quad'])
const hotelC = createOption('opt-C', 'Hotel C (Double Only)', ['single', 'double'])
const hotelD_SingleOnly = createOption('opt-D', 'Hotel D (Single Only)', ['single'])
const hotelE_QuadOnly = createOption('opt-E', 'Hotel E (Quad Only)', ['quad'])

const singleStayFixture: AccommodationStayDTO[] = [
  {
    order: 1,
    nights: 3,
    options: [hotelA, hotelB, hotelC, hotelD_SingleOnly, hotelE_QuadOnly],
  },
]

describe('Accommodation ↔ Room Allocation General Reconciliation Matrix', () => {
  // ─── Category 1: Recommended allocation + accommodation change ────────────
  it('Scenario 1: Recommended allocation adapts cleanly when hotel changes capabilities (Triple -> No Triple)', () => {
    // Hotel A (Single, Double, Triple) with 6 adults
    const initial = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-A' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: null, // User has not customized
    })

    expect(initial.status).toBe('valid_recommendation')
    expect(initial.supportedOccupancies).toEqual(['single', 'double', 'triple'])
    expect(initial.activeAllocationId).toBe('2xtriple')
    expect(initial.allocationToSend).toBeUndefined()

    // Switch to Hotel C (Single, Double only)
    const switched = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: null,
    })

    expect(switched.status).toBe('valid_recommendation')
    expect(switched.supportedOccupancies).toEqual(['single', 'double'])
    // RoomAllocationPolicy automatically resolves 3xdouble as optimal recommendation
    expect(switched.activeAllocationId).toBe('3xdouble')
    expect(switched.allocationToSend).toBeUndefined()
  })

  // ─── Category 2: Customized valid allocation + accommodation change ───────
  it('Scenario 2: Customized valid allocation is preserved across hotel changes when new hotel supports it', () => {
    // In Hotel A, user customized their arrangement to 3xDouble
    const initial = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-A' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: '3xdouble',
    })

    expect(initial.status).toBe('valid_custom')
    expect(initial.allocationToSend).toBe('3xdouble')

    // Switch to Hotel C (Single, Double only). Double is supported!
    const switched = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: '3xdouble',
    })

    // Preserved!
    expect(switched.status).toBe('valid_custom')
    expect(switched.allocationToSend).toBe('3xdouble')
    expect(switched.activeAllocationId).toBe('3xdouble')
  })

  // ─── Category 3: Customized invalid allocation + accommodation change ─────
  it('Scenario 3: Customized invalid allocation is blocked from pricing and flagged for adjustment', () => {
    // In Hotel A, user explicitly locked in 2xTriple
    const initial = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-A' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: '2xtriple',
    })
    expect(initial.status).toBe('valid_custom')

    // Switch to Hotel C (Single, Double only). Triple is NOT supported!
    const switched = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: '2xtriple',
    })

    // MUST NOT send to pricing!
    expect(switched.status).toBe('invalid_custom_requires_adjustment')
    expect(switched.allocationToSend).toBeUndefined()
    // Available options for Hotel C are provided so user can adjust
    expect(switched.availableOptions.length).toBeGreaterThan(0)
    expect(switched.availableOptions.some((o) => o.id === '3xdouble')).toBe(true)
  })

  // ─── Category 4: Multi-hop navigation A -> B -> C -> A ────────────────────
  it('Scenario 4: Multi-hop navigation (A -> B -> C -> A) maintains coherent state transitions', () => {
    // Hop 1: Hotel A (Single, Double, Triple) -> Recommended 2xTriple
    const hop1 = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-A' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(hop1.activeAllocationId).toBe('2xtriple')

    // Hop 2: Hotel B (Single, Double, Quad) -> Quad is supported!
    // RoomAllocationPolicy prioritizes standard Double occupancy for 6 adults -> 3xdouble
    const hop2 = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-B' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(hop2.supportedOccupancies).toEqual(['single', 'double', 'quad'])
    expect(hop2.activeAllocationId).toBe('3xdouble')
    expect(hop2.availableOptions.some((o) => o.id === '1xquad+1xdouble')).toBe(true)

    // Hop 3: Hotel C (Single, Double only) -> Recommended 3xdouble
    const hop3 = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(hop3.supportedOccupancies).toEqual(['single', 'double'])
    expect(hop3.activeAllocationId).toBe('3xdouble')

    // Hop 4: Return to Hotel A -> Recommended 2xtriple
    const hop4 = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-A' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(hop4.supportedOccupancies).toEqual(['single', 'double', 'triple'])
    expect(hop4.activeAllocationId).toBe('2xtriple')
  })

  // ─── Category 5: Headcount variation (Adults changes) ──────────────────────
  it('Scenario 5: Headcount variations dynamically update recommendation and reset custom locks', () => {
    // 2 adults -> 1 double
    const res2 = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 2,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(res2.activeAllocationId).toBe('1xdouble')

    // 4 adults -> 2 double
    const res4 = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 4,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(res4.activeAllocationId).toBe('2xdouble')

    // 1 adult -> 1 single
    const res1 = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 1,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(res1.activeAllocationId).toBe('1xsingle')
  })

  // ─── Category 6: Headcount variation (Children changes) ────────────────────
  it('Scenario 6: Children count variations correctly enforce child limits and room partitions', () => {
    // In Hotel B (Single, Double, Quad):
    // 2 adults + 1 child can fit in 1 Quad room (capacity 4, child limit 2)
    const withQuadAndChild = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-B' },
      adultsCount: 2,
      childrenCount: 1,
      customAllocationId: null,
    })
    expect(withQuadAndChild.availableOptions.some((o) => o.id === '1xquad')).toBe(true)

    // In Hotel C (Double max capacity 2):
    // 2 adults + 1 child = 3 guests. A double room has max capacity 2.
    // Therefore, minimum 2 rooms required (2xdouble or 1xdouble + 1xsingle)!
    const withDoubleAndChild = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 2,
      childrenCount: 1,
      customAllocationId: null,
    })
    expect(withDoubleAndChild.availableOptions.every((o) => o.roomCount >= 2)).toBe(true)

    // 2 adults + 2 children in Hotel C -> Requires 2 rooms (1 adult + 1 child in each)
    const with2Children = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 2,
      childrenCount: 2,
      customAllocationId: null,
    })
    expect(with2Children.activeAllocationId).toBe('2xdouble')
    expect(with2Children.availableOptions.some((o) => o.id === '2xdouble')).toBe(true)
  })

  // ─── Category 7: Room count variations ────────────────────────────────────
  it('Scenario 7: Generates all valid room count options for customer choice', () => {
    // 6 adults in Hotel C (Single + Double):
    // Minimum 3 rooms (3xdouble). Can also do 4 rooms (2xdouble + 2xsingle), 5 rooms (1xdouble + 4xsingle), 6 rooms (6xsingle)
    const res = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-C' },
      adultsCount: 6,
      childrenCount: 0,
      customAllocationId: null,
    })

    const roomCounts = res.availableOptions.map((o) => o.roomCount)
    expect(roomCounts).toContain(3)
    expect(roomCounts).toContain(4)
    expect(roomCounts).toContain(5)
    expect(roomCounts).toContain(6)
  })

  // ─── Category 8: Single-only and Quad-only capabilities ───────────────────
  it('Scenario 8: Works correctly with Single-only or Quad-only hotels', () => {
    // Hotel D (Single only) with 4 adults -> Exactly 4xsingle
    const singleOnly = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-D' },
      adultsCount: 4,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(singleOnly.activeAllocationId).toBe('4xsingle')
    expect(singleOnly.availableOptions).toHaveLength(1)

    // Hotel E (Quad only) with 4 adults -> Exactly 1xquad
    const quadOnly = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-E' },
      adultsCount: 4,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(quadOnly.activeAllocationId).toBe('1xquad')
  })

  // ─── Category 9: Multi-stay intersection of supported occupancies ─────────
  it('Scenario 9: Multi-stay intersection across diverse properties enforces compatibility', () => {
    const multiStay: AccommodationStayDTO[] = [
      {
        order: 1,
        nights: 2,
        options: [createOption('opt-cairo', 'Cairo Hotel', ['single', 'double', 'triple'])],
      },
      {
        order: 2,
        nights: 3,
        options: [createOption('opt-luxor', 'Luxor Cruise', ['double', 'triple', 'quad'])],
      },
    ]

    const res = reconcileRoomAllocation({
      stays: multiStay,
      selectedAccommodationOptions: { 1: 'opt-cairo', 2: 'opt-luxor' },
      adultsCount: 4,
      childrenCount: 0,
      customAllocationId: null,
    })

    // Intersection of [single, double, triple] and [double, triple, quad] is [double, triple]
    expect(res.supportedOccupancies).toEqual(['double', 'triple'])
    // Neither single nor quad are permitted
    expect(res.supportedOccupancies).not.toContain('single')
    expect(res.supportedOccupancies).not.toContain('quad')
  })

  // ─── Category 10 & 11: Stale response protection (Monotonic Request IDs) ───
  it('Scenario 10 & 11: Monotonic request ID drops stale responses from concurrent or interleaved requests', () => {
    let activeRequestId = 0
    let committedState: string | null = null

    // Helper simulating an async request
    function simulateRequest(
      label: string,
      latencyMs: number,
      onCommit: (result: string) => void,
    ): Promise<void> {
      const currentId = ++activeRequestId
      return new Promise((resolve) => {
        setTimeout(() => {
          if (currentId === activeRequestId) {
            committedState = label
            onCommit(label)
          }
          resolve()
        }, latencyMs)
      })
    }

    // Trigger Request A (Hotel change, slow 50ms)
    const p1 = simulateRequest('Request A (Hotel Change - Slow)', 50, (res) => {
      committedState = res
    })

    // Immediately trigger Request B (Manual Allocation apply, fast 10ms)
    const p2 = simulateRequest('Request B (Manual Allocation - Fast)', 10, (res) => {
      committedState = res
    })

    return Promise.all([p1, p2]).then(() => {
      // Even though Request A finishes after Request B, activeRequestId was 2 (Request B).
      // So Request A was dropped, and committedState remains Request B!
      expect(committedState).toBe('Request B (Manual Allocation - Fast)')
    })
  })

  // ─── Category 12: Impossible configurations are handled cleanly ───────────
  it('Scenario 12: Genuinely impossible configurations are flagged without inventing fake data', () => {
    // 3 adults in a Quad-only hotel (Quad requires 4 or at least 1 quad, but Quad only accommodates partitions that fit headcount)
    // 1 adult in a Quad-only hotel: Quad only accepts adults <= 4, but 1 adult in 1 quad room is valid
    // 0 adults: strictly invalid
    const zeroAdults = reconcileRoomAllocation({
      stays: singleStayFixture,
      selectedAccommodationOptions: { 1: 'opt-A' },
      adultsCount: 0,
      childrenCount: 0,
      customAllocationId: null,
    })
    expect(zeroAdults.status).toBe('impossible_configuration')
    expect(zeroAdults.availableOptions).toHaveLength(0)
  })
})
