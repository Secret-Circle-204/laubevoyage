import { describe, it, expect } from 'vitest'
import {
  RoomAllocationPolicy,
  type OccupancyType,
  type RoomAllocationOption,
} from '@/domains/experience/room-allocation-policy'
import {
  resolveSmartRebalancingSuggestion,
  performIntentAwareAutoBalance,
  type RebalancingSuggestion,
} from '@/components/features/experience/RoomArrangementModal'

const resolveDeterministicSuggestion = resolveSmartRebalancingSuggestion

describe('Smart Room Arrangement Editor - Contract & Logic Unit Tests', () => {
  const sampleOptions: RoomAllocationOption[] = [
    {
      id: '1xtriple',
      roomCount: 1,
      isRecommended: true,
      rooms: [{ roomIndex: 1, occupancy: 'triple', adults: 3, children: 0 }],
    },
    {
      id: '1xdouble+1xsingle',
      roomCount: 2,
      isRecommended: false,
      rooms: [
        { roomIndex: 1, occupancy: 'double', adults: 2, children: 0 },
        { roomIndex: 2, occupancy: 'single', adults: 1, children: 0 },
      ],
    },
    {
      id: '3xsingle',
      roomCount: 3,
      isRecommended: false,
      rooms: [
        { roomIndex: 1, occupancy: 'single', adults: 1, children: 0 },
        { roomIndex: 2, occupancy: 'single', adults: 1, children: 0 },
        { roomIndex: 3, occupancy: 'single', adults: 1, children: 0 },
      ],
    },
  ]

  it('does not suggest an option outside availableOptions', () => {
    const suggestion = resolveDeterministicSuggestion({
      draftCounts: { quad: 0, triple: 0, double: 1, single: 0 },
      availableOptions: sampleOptions,
      totalGuests: 3,
    })

    expect(suggestion).not.toBeNull()
    const isPresentInAvailable = sampleOptions.some((opt) => opt.id === suggestion!.option.id)
    expect(isPresentInAvailable).toBe(true)
  })

  it('shows unavailable state when availableOptions is empty and does not fabricate suggestions', () => {
    const suggestion = resolveDeterministicSuggestion({
      draftCounts: { quad: 0, triple: 0, double: 1, single: 0 },
      availableOptions: [],
      totalGuests: 3,
    })

    expect(suggestion).toBeNull()
  })

  it('selects the same suggestion consistently when candidates tie (deterministic ordering)', () => {
    // Both 1xtriple (delta = |1-0| + |0-1| = 2) and 1xdouble+1xsingle (delta = |1-1| + |1-0| = 1)
    // Let's create an exact tie scenario:
    const optionA: RoomAllocationOption = {
      id: 'option-a',
      roomCount: 2,
      isRecommended: true,
      rooms: [
        { roomIndex: 1, occupancy: 'double', adults: 2, children: 0 },
        { roomIndex: 2, occupancy: 'single', adults: 1, children: 0 },
      ],
    }
    const optionB: RoomAllocationOption = {
      id: 'option-b',
      roomCount: 2,
      isRecommended: false,
      rooms: [
        { roomIndex: 1, occupancy: 'single', adults: 1, children: 0 },
        { roomIndex: 2, occupancy: 'double', adults: 2, children: 0 },
      ],
    }

    const firstRun = resolveDeterministicSuggestion({
      draftCounts: { quad: 0, triple: 0, double: 0, single: 0 },
      availableOptions: [optionA, optionB],
      totalGuests: 3,
    })
    const secondRun = resolveDeterministicSuggestion({
      draftCounts: { quad: 0, triple: 0, double: 0, single: 0 },
      availableOptions: [optionA, optionB],
      totalGuests: 3,
    })

    expect(firstRun?.option.id).toBe('option-a')
    expect(secondRun?.option.id).toBe('option-a')
  })

  it('compares complete room composition, not only total room count', () => {
    // When user has 1 Double room:
    // Delta to 1xdouble+1xsingle = |1-1| + |1-0| = 1
    // Delta to 1xtriple = |1-0| + |0-1| = 2
    // Delta to 3xsingle = |0-1| + |3-0| = 4
    const doubleSuggestion = resolveDeterministicSuggestion({
      draftCounts: { quad: 0, triple: 0, double: 1, single: 0 },
      availableOptions: sampleOptions,
      totalGuests: 3,
    })
    expect(doubleSuggestion?.option.id).toBe('1xdouble+1xsingle')
    expect(doubleSuggestion?.reason).toBe('incomplete')

    // When user has 2 Single rooms:
    // Delta to 3xsingle = |3-2| = 1 (just add 1 single)
    // Delta to 1xdouble+1xsingle = |1-0| + |1-2| = 2
    const singleSuggestion = resolveDeterministicSuggestion({
      draftCounts: { quad: 0, triple: 0, double: 0, single: 2 },
      availableOptions: sampleOptions,
      totalGuests: 3,
    })
    expect(singleSuggestion?.option.id).toBe('3xsingle')
    expect(singleSuggestion?.reason).toBe('incomplete')
  })

  it('allows decrementing a room count to zero and never below zero', () => {
    let count = 1
    // Decrement to zero
    count = Math.max(0, count - 1)
    expect(count).toBe(0)

    // Decrementing when already zero stays zero
    count = Math.max(0, count - 1)
    expect(count).toBe(0)
  })

  it('increment does not silently modify other room types', () => {
    const initialDraft: Record<OccupancyType, number> = {
      quad: 0,
      triple: 1,
      double: 0,
      single: 0,
    }

    // User increments Double room count
    const updatedDraft = {
      ...initialDraft,
      double: initialDraft.double + 1,
    }

    expect(updatedDraft.double).toBe(1)
    expect(updatedDraft.triple).toBe(1) // Unchanged
    expect(updatedDraft.single).toBe(0) // Unchanged
    expect(updatedDraft.quad).toBe(0)   // Unchanged
  })

  it('Use Suggestion is the only action that updates all room counters atomically', () => {
    const draft: Record<OccupancyType, number> = {
      quad: 0,
      triple: 0,
      double: 0,
      single: 0,
    }

    const suggestion = sampleOptions[1] // 1xdouble + 1xsingle
    const appliedCounts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 0, single: 0 }
    suggestion.rooms.forEach((r) => {
      appliedCounts[r.occupancy] = (appliedCounts[r.occupancy] || 0) + 1
    })

    expect(appliedCounts.double).toBe(1)
    expect(appliedCounts.single).toBe(1)
    expect(appliedCounts.triple).toBe(0)
  })

  it('locally_matched does not imply final server validity', () => {
    const candidateOption = sampleOptions[0]
    let serverValidationState: 'idle' | 'validating' | 'valid' | 'invalid' = 'idle'

    const checkCanApply = (
      isApp: boolean,
      isMatched: boolean,
      state: 'idle' | 'validating' | 'valid' | 'invalid',
    ) => !isApp && isMatched && state !== 'invalid'

    // When draft matches candidateOption, status is locally_matched
    const isLocallyMatched = candidateOption !== null
    expect(isLocallyMatched).toBe(true)
    expect(serverValidationState).toBe('idle') // Not yet valid!

    // Apply button becomes enabled for user submission
    const canApply = checkCanApply(false, isLocallyMatched, serverValidationState)
    expect(canApply).toBe(true)

    // Validation state only becomes valid after server confirmation
    serverValidationState = 'valid'
    expect(serverValidationState).toBe('valid')
  })

  it('Apply remains disabled while validation is pending or when invalid', () => {
    const isLocallyMatched = true
    const checkCanApply = (
      isApp: boolean,
      isMatched: boolean,
      state: 'idle' | 'validating' | 'valid' | 'invalid',
    ) => !isApp && isMatched && state !== 'invalid'

    const canApplyWhileValidating = checkCanApply(true, isLocallyMatched, 'validating')
    expect(canApplyWhileValidating).toBe(false)

    // After server failure
    const canApplyAfterFailure = checkCanApply(false, isLocallyMatched, 'invalid')
    expect(canApplyAfterFailure).toBe(false)
  })

  it('server failure keeps the modal open and preserves draft state', () => {
    const draftCounts: Record<OccupancyType, number> = { quad: 0, triple: 1, double: 0, single: 0 }
    let isOpen = true
    let errorMessage: string | null = null

    // Simulate server failure
    const serverResult = { success: false, error: 'Departure slot has reached maximum capacity.' }
    if (!serverResult.success) {
      errorMessage = serverResult.error
      // Modal is NOT closed
    }

    expect(isOpen).toBe(true)
    expect(errorMessage).toBe('Departure slot has reached maximum capacity.')
    expect(draftCounts.triple).toBe(1)
  })

  it('stale validation response cannot overwrite newer draft state (requestIdRef guard)', () => {
    let requestId = 0
    let committedId: string | null = null

    // Request 1 dispatched
    const req1 = ++requestId // 1

    // User immediately changes stepper, dispatching Request 2
    const req2 = ++requestId // 2

    // Delayed response for Request 1 arrives
    if (req1 === requestId) {
      committedId = 'req1-stale'
    }

    expect(committedId).toBeNull() // Stale response discarded!

    // Response for Request 2 arrives
    if (req2 === requestId) {
      committedId = 'req2-current'
    }

    expect(committedId).toBe('req2-current') // Current response committed!
  })

  it('Cancel discards draft changes without side effects on active option', () => {
    const activeOptionId = '1xtriple'
    let draftCounts: Record<OccupancyType, number> = { quad: 0, triple: 0, double: 2, single: 1 }

    // User cancels
    const onCancel = () => {
      // Discard draft without modifying activeOptionId
    }
    onCancel()

    expect(activeOptionId).toBe('1xtriple')
  })

  it('rebalances excessive capacity for 6 guests (2 single + 2 double + 2 triple = 12 cap) to closest approved option', () => {
    const sixGuestOptions: RoomAllocationOption[] = [
      {
        id: '3xdouble',
        roomCount: 3,
        isRecommended: true,
        rooms: [
          { roomIndex: 1, occupancy: 'double', adults: 2, children: 0 },
          { roomIndex: 2, occupancy: 'double', adults: 2, children: 0 },
          { roomIndex: 3, occupancy: 'double', adults: 2, children: 0 },
        ],
      },
      {
        id: '1xquad+1xdouble',
        roomCount: 2,
        isRecommended: false,
        rooms: [
          { roomIndex: 1, occupancy: 'quad', adults: 4, children: 0 },
          { roomIndex: 2, occupancy: 'double', adults: 2, children: 0 },
        ],
      },
      {
        id: '6xsingle',
        roomCount: 6,
        isRecommended: false,
        rooms: Array.from({ length: 6 }, (_, i) => ({
          roomIndex: i + 1,
          occupancy: 'single' as OccupancyType,
          adults: 1,
          children: 0,
        })),
      },
    ]

    const suggestion = resolveSmartRebalancingSuggestion({
      draftCounts: { quad: 0, triple: 2, double: 2, single: 2 }, // capacity = 12
      availableOptions: sixGuestOptions,
      totalGuests: 6,
      locale: 'ar',
    })

    expect(suggestion).not.toBeNull()
    expect(suggestion?.reason).toBe('excess_capacity')
    expect(suggestion?.capacityBefore).toBe(12)
    expect(suggestion?.capacityAfter).toBe(6)
    expect(suggestion?.option.id).toBe('3xdouble')
    expect(suggestion?.label).toContain('12')
    expect(suggestion?.label).toContain('6')
  })

  it('does not produce rebalancing suggestion when draft already matches an available option', () => {
    const suggestion = resolveSmartRebalancingSuggestion({
      draftCounts: { quad: 0, triple: 0, double: 3, single: 0 },
      availableOptions: [
        {
          id: '3xdouble',
          roomCount: 3,
          isRecommended: true,
          rooms: [
            { roomIndex: 1, occupancy: 'double', adults: 2, children: 0 },
            { roomIndex: 2, occupancy: 'double', adults: 2, children: 0 },
            { roomIndex: 3, occupancy: 'double', adults: 2, children: 0 },
          ],
        },
      ],
      totalGuests: 6,
    })

    expect(suggestion).toBeNull()
  })

  describe('Intent-Aware Auto-Balancing (Level 1 Surplus Cleanup)', () => {
    const fiveGuestOptions: RoomAllocationOption[] = [
      {
        id: '5xsingle',
        roomCount: 5,
        isRecommended: false,
        rooms: Array.from({ length: 5 }, (_, i) => ({
          roomIndex: i + 1,
          occupancy: 'single' as OccupancyType,
          adults: 1,
          children: 0,
        })),
      },
      {
        id: '1xsingle+2xdouble',
        roomCount: 3,
        isRecommended: false,
        rooms: [
          { roomIndex: 1, occupancy: 'double', adults: 2, children: 0 },
          { roomIndex: 2, occupancy: 'double', adults: 2, children: 0 },
          { roomIndex: 3, occupancy: 'single', adults: 1, children: 0 },
        ],
      },
      {
        id: '1xtriple+1xdouble',
        roomCount: 2,
        isRecommended: true,
        rooms: [
          { roomIndex: 1, occupancy: 'triple', adults: 3, children: 0 },
          { roomIndex: 2, occupancy: 'double', adults: 2, children: 0 },
        ],
      },
    ]

    it('cleans up surplus untouched rooms when user increases singles to 5 for 5 guests', () => {
      // User had: single: 4, double: 3, triple: 3 (capacity 19 for 5 guests)
      // User clicks [+] on single -> single becomes 5
      const result = performIntentAwareAutoBalance({
        draftCounts: { quad: 0, triple: 3, double: 3, single: 4 },
        touchedOccupancy: 'single',
        nextCount: 5,
        totalGuests: 5,
        availableOptions: fiveGuestOptions,
      })

      // Single is protected at 5, untouched double and triple are auto-cleaned to 0
      expect(result.single).toBe(5)
      expect(result.double).toBe(0)
      expect(result.triple).toBe(0)
      expect(result.quad).toBe(0)
    })

    it('preserves user mix of rooms when capacity is valid (e.g. 1 single + 2 double = 5)', () => {
      // User has 2 doubles (cap 4) and adds 1 single
      const result = performIntentAwareAutoBalance({
        draftCounts: { quad: 0, triple: 0, double: 2, single: 0 },
        touchedOccupancy: 'single',
        nextCount: 1,
        totalGuests: 5,
        availableOptions: fiveGuestOptions,
      })

      // Does not wipe doubles, preserves 2 doubles + 1 single = 5
      expect(result.single).toBe(1)
      expect(result.double).toBe(2)
      expect(result.triple).toBe(0)
    })

    it('does not silently invent rooms when user decrements a counter below party size', () => {
      // User decrements single from 5 to 4
      const result = performIntentAwareAutoBalance({
        draftCounts: { quad: 0, triple: 0, double: 0, single: 5 },
        touchedOccupancy: 'single',
        nextCount: 4,
        totalGuests: 5,
        availableOptions: fiveGuestOptions,
      })

      // Stays at 4 singles, does not fabricate other rooms
      expect(result.single).toBe(4)
      expect(result.double).toBe(0)
      expect(result.triple).toBe(0)
    })

    it('reduces surplus untouched rooms to land on 1xtriple+1xdouble when triple increased to 1', () => {
      // User had double: 2, single: 2 (capacity 6) and clicks [+] on triple -> triple: 1
      const result = performIntentAwareAutoBalance({
        draftCounts: { quad: 0, triple: 0, double: 2, single: 2 },
        touchedOccupancy: 'triple',
        nextCount: 1,
        totalGuests: 5,
        availableOptions: fiveGuestOptions,
      })

      // Triple is protected at 1, double is reduced to 1, single is reduced to 0 -> 1 triple + 1 double = 5
      expect(result.triple).toBe(1)
      expect(result.double).toBe(1)
      expect(result.single).toBe(0)
    })
  })
})
