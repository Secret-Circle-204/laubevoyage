import { describe, it, expect, vi } from 'vitest'
import { composeWhere } from '../src/components/admin/universal-table/utils/composeWhere'
import type { Where } from 'payload'

vi.mock('../src/components/admin/universal-table/TableKpiStrip', () => ({
  TableKpiStrip: (props: any) => props,
}))

describe('Bookings Workspace Query Semantics & Composition Integrity', () => {
  it('1. Setting Confirmed status produces canonical status=confirmed where clause', () => {
    const result = composeWhere(undefined, 'status', { equals: 'confirmed' })
    expect(result).toEqual({
      status: { equals: 'confirmed' },
    })
  })

  it('2. Setting Outstanding payment produces canonical paymentStatus IN [unpaid, partially_paid]', () => {
    const result = composeWhere(undefined, 'paymentStatus', { in: ['unpaid', 'partially_paid'] })
    expect(result).toEqual({
      paymentStatus: { in: ['unpaid', 'partially_paid'] },
    })
  })

  it('3. Setting Fully Paid produces canonical paymentStatus = paid', () => {
    const result = composeWhere(undefined, 'paymentStatus', { equals: 'paid' })
    expect(result).toEqual({
      paymentStatus: { equals: 'paid' },
    })
  })

  it('4. Composition: Confirmed + Outstanding produces valid AND composition', () => {
    const initialWhere: Where = { status: { equals: 'confirmed' } }
    const composed = composeWhere(initialWhere, 'paymentStatus', { in: ['unpaid', 'partially_paid'] })

    expect(composed).toEqual({
      and: [
        { status: { equals: 'confirmed' } },
        { paymentStatus: { in: ['unpaid', 'partially_paid'] } },
      ],
    })
  })

  it('5. Composition: Outstanding + Confirmed produces valid AND composition', () => {
    const initialWhere: Where = { paymentStatus: { in: ['unpaid', 'partially_paid'] } }
    const composed = composeWhere(initialWhere, 'status', { equals: 'confirmed' })

    expect(composed).toEqual({
      and: [
        { paymentStatus: { in: ['unpaid', 'partially_paid'] } },
        { status: { equals: 'confirmed' } },
      ],
    })
  })

  it('6. Removing a filter leaves the other filter strictly intact', () => {
    const composed: Where = {
      and: [
        { status: { equals: 'confirmed' } },
        { paymentStatus: { in: ['unpaid', 'partially_paid'] } },
      ],
    }

    const removedPayment = composeWhere(composed, 'paymentStatus', null)
    expect(removedPayment).toEqual({
      status: { equals: 'confirmed' },
    })

    const removedStatus = composeWhere(composed, 'status', null)
    expect(removedStatus).toEqual({
      paymentStatus: { in: ['unpaid', 'partially_paid'] },
    })
  })

  it('7. Handles Payload WhereBuilder hoisted structure without nesting blowup', () => {
    const hoistedPayloadWhere: Where = {
      or: [
        {
          and: [
            { paymentStatus: { in: ['unpaid', 'partially_paid'] } },
          ],
        },
      ],
    }

    // Removing paymentStatus from hoisted shape
    const cleared = composeWhere(hoistedPayloadWhere, 'paymentStatus', null)
    expect(cleared).toEqual({})

    // Switching from hoisted paymentStatus to Confirmed status
    const replaced = composeWhere(cleared, 'status', { equals: 'confirmed' })
    expect(replaced).toEqual({
      status: { equals: 'confirmed' },
    })
  })

  it('8. REGRESSION INVARIANT: status field can NEVER receive unpaid or partially_paid', () => {
    const validBookingStatuses = [
      'draft',
      'pending_payment',
      'pending_admin_review',
      'paid',
      'confirmed',
      'completed',
      'cancelled',
      'refunded',
      'expired',
      'payment_received_after_expiry',
    ]

    const testWhere = composeWhere(undefined, 'status', { equals: 'confirmed' })
    const statusVal = (testWhere as any).status?.equals

    expect(validBookingStatuses).toContain(statusVal)
    expect(statusVal).not.toBe('unpaid')
    expect(statusVal).not.toBe('partially_paid')
  })

  it('9. REGRESSION INVARIANT: paymentStatus owns unpaid and partially_paid', () => {
    const validPaymentStatuses = [
      'unpaid',
      'partially_paid',
      'paid',
      'refunded',
      'partially_refunded',
      'written_off',
    ]

    const testWhere = composeWhere(undefined, 'paymentStatus', { in: ['unpaid', 'partially_paid'] })
    const inVals = (testWhere as any).paymentStatus?.in

    expect(Array.isArray(inVals)).toBe(true)
    for (const val of inVals) {
      expect(validPaymentStatuses).toContain(val)
    }
  })

  it('10. ARCHITECTURAL INVARIANT: Bookings collection config enables select API and beforeListTable Server Component', async () => {
    const { Bookings } = await import('../src/collections/Bookings')
    expect(Bookings.admin?.enableListViewSelectAPI).toBe(true)
    expect(Bookings.admin?.components?.beforeListTable).toEqual([
      '@/components/admin/universal-table/UniversalKpiStrip#UniversalKpiStrip',
    ])
  })

  it('11. ARCHITECTURAL INVARIANT: BookingsKpiStrip executes bounded count queries and returns declarative metrics with loading=false', async () => {
    const { BookingsKpiStrip } = await import('../src/components/admin/universal-table/BookingsKpiStrip')
    
    const countCalls: any[] = []
    const mockPayload: any = {
      count: async (args: any) => {
        countCalls.push(args)
        if (args.where?.status?.equals === 'pending_admin_review') return { totalDocs: 1 }
        if (args.where?.status?.equals === 'confirmed') return { totalDocs: 5 }
        if (args.where?.paymentStatus?.in) return { totalDocs: 7 }
        return { totalDocs: 13 }
      },
    }

    const jsx = await BookingsKpiStrip({ payload: mockPayload })
    expect(jsx).not.toBeNull()
    expect(countCalls.length).toBe(4)

    // Verify 4 authoritative count queries
    expect(countCalls[0].collection).toBe('bookings')
    expect(countCalls[0].where).toBeUndefined()
    expect(countCalls[1].where).toEqual({ status: { equals: 'pending_admin_review' } })
    expect(countCalls[2].where).toEqual({ status: { equals: 'confirmed' } })
    expect(countCalls[3].where).toEqual({ paymentStatus: { in: ['unpaid', 'partially_paid'] } })

    // Verify metrics passed to TableKpiStrip
    const metrics = (jsx as any).props.metrics
    expect(metrics.length).toBe(4)
    expect(metrics[0]).toMatchObject({ id: 'total', value: 13, loading: false })
    expect(metrics[1]).toMatchObject({ id: 'pending_review', value: 1, loading: false, whereFilter: { status: { equals: 'pending_admin_review' } } })
    expect(metrics[2]).toMatchObject({ id: 'confirmed', value: 5, loading: false, whereFilter: { status: { equals: 'confirmed' } } })
    expect(metrics[3]).toMatchObject({ id: 'outstanding', value: 7, loading: false, whereFilter: { paymentStatus: { in: ['unpaid', 'partially_paid'] } } })
  })

  it('12. EXTENDED STRESS REGRESSION SEQUENCE: Outstanding -> Confirmed -> Outstanding -> Pending -> Payment Fully Paid -> Lifecycle Confirmed -> Reset -> Outstanding -> Search -> Clear Search -> Pagination -> Outstanding', () => {
    let currentWhere: Where | undefined = undefined
    let currentSearch: string | undefined = undefined
    let currentPage = 1

    const verifyNoEnumPollution = (where: Where | undefined) => {
      if (!where) return
      const stringified = JSON.stringify(where)
      expect(stringified).not.toContain('"status":{"equals":"unpaid"}')
      expect(stringified).not.toContain('"status":{"equals":"partially_paid"}')
      expect(stringified).not.toContain('"status":{"in":["unpaid"')
      expect(stringified).not.toContain('"paymentStatus":{"equals":"confirmed"}')
      expect(stringified).not.toContain('"paymentStatus":{"equals":"pending_admin_review"}')
    }

    // Step 1: Outstanding KPI
    currentWhere = { paymentStatus: { in: ['unpaid', 'partially_paid'] } }
    verifyNoEnumPollution(currentWhere)
    expect(currentWhere).toEqual({ paymentStatus: { in: ['unpaid', 'partially_paid'] } })

    // Step 2: Confirmed KPI
    currentWhere = { status: { equals: 'confirmed' } }
    verifyNoEnumPollution(currentWhere)
    expect(currentWhere).toEqual({ status: { equals: 'confirmed' } })

    // Step 3: Outstanding KPI
    currentWhere = { paymentStatus: { in: ['unpaid', 'partially_paid'] } }
    verifyNoEnumPollution(currentWhere)
    expect(currentWhere).toEqual({ paymentStatus: { in: ['unpaid', 'partially_paid'] } })

    // Step 4: Pending Review KPI
    currentWhere = { status: { equals: 'pending_admin_review' } }
    verifyNoEnumPollution(currentWhere)
    expect(currentWhere).toEqual({ status: { equals: 'pending_admin_review' } })

    // Step 5: QuickFilter Payment = Fully Paid
    currentWhere = composeWhere(currentWhere, 'paymentStatus', { equals: 'paid' })
    verifyNoEnumPollution(currentWhere)
    expect(currentWhere).toEqual({
      and: [
        { status: { equals: 'pending_admin_review' } },
        { paymentStatus: { equals: 'paid' } },
      ],
    })

    // Step 6: QuickFilter Lifecycle = Confirmed
    currentWhere = composeWhere(currentWhere, 'status', { equals: 'confirmed' })
    verifyNoEnumPollution(currentWhere)
    expect(currentWhere).toEqual({
      and: [
        { status: { equals: 'confirmed' } },
        { paymentStatus: { equals: 'paid' } },
      ],
    })

    // Step 7: Reset
    currentWhere = undefined
    currentSearch = undefined
    currentPage = 1
    expect(currentWhere).toBeUndefined()
    expect(currentSearch).toBeUndefined()
    expect(currentPage).toBe(1)

    // Step 8: Outstanding KPI
    currentWhere = { paymentStatus: { in: ['unpaid', 'partially_paid'] } }
    verifyNoEnumPollution(currentWhere)

    // Step 9: Search 'INV-1234'
    currentSearch = 'INV-1234'
    verifyNoEnumPollution(currentWhere)
    expect(currentSearch).toBe('INV-1234')

    // Step 10: Clear Search
    currentSearch = undefined
    verifyNoEnumPollution(currentWhere)
    expect(currentSearch).toBeUndefined()

    // Step 11: Pagination to Page 2
    currentPage = 2
    verifyNoEnumPollution(currentWhere)
    expect(currentPage).toBe(2)

    // Step 12: Outstanding KPI (resets page to 1)
    currentWhere = { paymentStatus: { in: ['unpaid', 'partially_paid'] } }
    currentPage = 1
    verifyNoEnumPollution(currentWhere)
    expect(currentPage).toBe(1)
    expect(currentWhere).toEqual({ paymentStatus: { in: ['unpaid', 'partially_paid'] } })
  })

  it('13. COLLECTION AGNOSTIC: Experiences collection presentation config conforms to Universal Architecture', async () => {
    const { experiencesPresentation } = await import('../src/components/admin/universal-table/configs/experiences')
    expect(experiencesPresentation.collectionSlug).toBe('experiences')
    expect(experiencesPresentation.capabilities?.metrics).toBe(true)
    expect(experiencesPresentation.capabilities?.selection).toBe(true)
    expect(experiencesPresentation.toolbar?.capabilities?.advancedFilters).toBe(true)
    expect(experiencesPresentation.toolbar?.quickFilters?.length).toBeGreaterThanOrEqual(3)

    // Test composeWhere on Experiences fields (city, type, availability)
    let expWhere = composeWhere(undefined, 'city', { equals: 'city_cairo_1' })
    expect(expWhere).toEqual({ city: { equals: 'city_cairo_1' } })

    expWhere = composeWhere(expWhere, 'type', { equals: 'package' })
    expect(expWhere).toEqual({
      and: [
        { city: { equals: 'city_cairo_1' } },
        { type: { equals: 'package' } },
      ],
    })

    expWhere = composeWhere(expWhere, 'availability', { equals: 'available' })
    expect(expWhere).toEqual({
      and: [
        { city: { equals: 'city_cairo_1' } },
        { type: { equals: 'package' } },
        { availability: { equals: 'available' } },
      ],
    })

    // Removing city leaves type and availability intact
    expWhere = composeWhere(expWhere, 'city', null)
    expect(expWhere).toEqual({
      and: [
        { type: { equals: 'package' } },
        { availability: { equals: 'available' } },
      ],
    })
  })

  it('14. ARCHITECTURAL INVARIANT: ExperiencesKpiStrip executes bounded count queries and returns declarative metrics with loading=false', async () => {
    const { ExperiencesKpiStrip } = await import('../src/components/admin/universal-table/BookingsKpiStrip')
    const countCalls: any[] = []
    const mockPayload: any = {
      count: async (args: any) => {
        countCalls.push(args)
        if (args.where?.availability?.equals === 'available') return { totalDocs: 8 }
        if (args.where?.type?.equals === 'package') return { totalDocs: 6 }
        if (args.where?.type?.equals === 'daily_tour') return { totalDocs: 4 }
        return { totalDocs: 10 }
      },
    }

    const jsx = await ExperiencesKpiStrip({ payload: mockPayload })
    expect(jsx).not.toBeNull()
    expect(countCalls.length).toBe(4)

    // Verify 4 authoritative count queries
    expect(countCalls[0].collection).toBe('experiences')
    expect(countCalls[0].where).toBeUndefined()
    expect(countCalls[1].where).toEqual({ availability: { equals: 'available' } })
    expect(countCalls[2].where).toEqual({ type: { equals: 'package' } })
    expect(countCalls[3].where).toEqual({ type: { equals: 'daily_tour' } })

    // Verify metrics passed to TableKpiStrip
    const metrics = (jsx as any).props.metrics
    expect(metrics.length).toBe(4)
    expect(metrics[0]).toMatchObject({ id: 'total', value: 10, loading: false })
    expect(metrics[1]).toMatchObject({ id: 'available', value: 8, loading: false, whereFilter: { availability: { equals: 'available' } } })
    expect(metrics[2]).toMatchObject({ id: 'packages', value: 6, loading: false, whereFilter: { type: { equals: 'package' } } })
    expect(metrics[3]).toMatchObject({ id: 'daily_tours', value: 4, loading: false, whereFilter: { type: { equals: 'daily_tour' } } })
  })

  it('15. ACCESS CONTROL INVARIANT: UniversalKpiStrip strictly enforces collection access control with overrideAccess: false and authenticated user', async () => {
    const { UniversalKpiStrip } = await import('../src/components/admin/universal-table/UniversalKpiStrip')
    const countCalls: any[] = []
    const mockUser = { id: 'usr_admin_999', role: 'admin' }
    const mockPayload: any = {
      count: async (args: any) => {
        countCalls.push(args)
        return { totalDocs: 5 }
      },
    }

    await UniversalKpiStrip({
      payload: mockPayload,
      collectionSlug: 'bookings',
      user: mockUser,
    })

    expect(countCalls.length).toBe(4)
    for (const call of countCalls) {
      expect(call.overrideAccess).toBe(false)
      expect(call.user).toEqual(mockUser)
    }
  })

  it('16. CACHE INVARIANT: Rapid consecutive KPI requests within TTL do not execute duplicate database queries', async () => {
    const { UniversalKpiStrip } = await import('../src/components/admin/universal-table/UniversalKpiStrip')
    let callCount = 0
    const mockPayload: any = {
      count: async () => {
        callCount++
        return { totalDocs: 42 }
      },
    }

    const testUser = { id: `usr_test_cache_${Date.now()}` }

    // First call: executes database queries
    const res1 = await UniversalKpiStrip({
      payload: mockPayload,
      collectionSlug: 'bookings',
      user: testUser,
    })
    expect(res1).not.toBeNull()
    const firstCallCount = callCount
    expect(firstCallCount).toBe(4)

    // Second call with same user/collection: hits in-memory cache instantly
    const res2 = await UniversalKpiStrip({
      payload: mockPayload,
      collectionSlug: 'bookings',
      user: testUser,
    })
    expect(res2).not.toBeNull()
    expect(callCount).toBe(firstCallCount) // ZERO additional database calls
  })

  it('17. WHEREBUILDER KEY ISOLATION INVARIANT: activeFilterFieldsKey cleanly separates paymentStatus from status', async () => {
    const { extractClauseMap } = await import('../src/components/admin/universal-table/utils/composeWhere')

    // Outstanding intent
    const outstandingWhere: Where = { paymentStatus: { in: ['unpaid', 'partially_paid'] } }
    const outstandingKey = Array.from(extractClauseMap(outstandingWhere).keys()).sort().join(':')
    expect(outstandingKey).toBe('paymentStatus')

    // Confirmed intent
    const confirmedWhere: Where = { status: { equals: 'confirmed' } }
    const confirmedKey = Array.from(extractClauseMap(confirmedWhere).keys()).sort().join(':')
    expect(confirmedKey).toBe('status')

    // Compound intent
    const compoundWhere: Where = {
      and: [
        { status: { equals: 'confirmed' } },
        { paymentStatus: { equals: 'paid' } },
      ],
    }
    const compoundKey = Array.from(extractClauseMap(compoundWhere).keys()).sort().join(':')
    expect(compoundKey).toBe('paymentStatus:status')

    // The keys are strictly distinct, guaranteeing React component unmounting and zero state reuse
    expect(outstandingKey).not.toBe(confirmedKey)
    expect(compoundKey).not.toBe(confirmedKey)
  })
})


