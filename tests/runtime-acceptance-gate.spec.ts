import { describe, it, expect, vi } from 'vitest'
import { UniversalKpiStrip } from '../src/components/admin/universal-table/UniversalKpiStrip'
import { composeWhere, extractClauseMap } from '../src/components/admin/universal-table/utils/composeWhere'
import { experiencesPresentation } from '../src/components/admin/universal-table/configs/experiences'
import { bookingsPresentation } from '../src/components/admin/universal-table/configs/bookings'

vi.mock('../src/components/admin/universal-table/TableKpiStrip', () => ({
  TableKpiStrip: (props: any) => props,
}))

describe('Final Verification Gate: Operational Runtime & Integrity Suite', () => {
  it('GATE 1: Experiences KPI Surface — Computes all 4 authoritative metrics with correct contracts', async () => {
    let countCalls: Array<{ collection: string; where: any; user: any; overrideAccess: boolean }> = []

    const mockPayload: any = {
      count: vi.fn(async (args) => {
        countCalls.push(args)
        if (!args.where) return { totalDocs: 120 } // Total
        if (args.where.type?.equals === 'package') return { totalDocs: 80 }
        if (args.where.type?.equals === 'daily_tour') return { totalDocs: 40 }
        if (args.where.availability?.equals === 'available') return { totalDocs: 95 }
        return { totalDocs: 0 }
      }),
    }

    const testUser = { id: 'admin_usr_exp_1', role: 'admin' }

    const res = await UniversalKpiStrip({
      payload: mockPayload,
      collectionSlug: 'experiences',
      user: testUser,
      overrideAccess: false,
    })

    expect(res).not.toBeNull()
    const metrics = (res as any).props?.metrics
    expect(metrics).toHaveLength(4)

    // Metric 1: Total Experiences
    expect(metrics[0].id).toBe('total')
    expect(metrics[0].value).toBe(120)
    expect(metrics[0].loading).toBe(false)
    expect(metrics[0].whereFilter).toBeUndefined()

    // Metric 2: Available
    expect(metrics[1].id).toBe('available')
    expect(metrics[1].value).toBe(95)
    expect(metrics[1].percentage).toBe(79) // 95 / 120 = 79%
    expect(metrics[1].whereFilter).toEqual({ availability: { equals: 'available' } })

    // Metric 3: Packages
    expect(metrics[2].id).toBe('packages')
    expect(metrics[2].value).toBe(80)
    expect(metrics[2].percentage).toBe(67) // 80 / 120 = 67%
    expect(metrics[2].whereFilter).toEqual({ type: { equals: 'package' } })

    // Metric 4: Daily Tours
    expect(metrics[3].id).toBe('daily_tours')
    expect(metrics[3].value).toBe(40)
    expect(metrics[3].percentage).toBe(33) // 40 / 120 = 33%
    expect(metrics[3].whereFilter).toEqual({ type: { equals: 'daily_tour' } })

    // Verify all 4 counts were executed in parallel via bounded count API
    expect(mockPayload.count).toHaveBeenCalledTimes(4)
    for (const call of countCalls) {
      expect(call.collection).toBe('experiences')
      expect(call.overrideAccess).toBe(false)
      expect(call.user).toEqual(testUser)
    }
  })

  it('GATE 2: Bookings KPI Surface — Computes all 4 authoritative metrics with correct contracts', async () => {
    let countCalls: Array<{ collection: string; where: any; user: any; overrideAccess: boolean }> = []

    const mockPayload: any = {
      count: vi.fn(async (args) => {
        countCalls.push(args)
        if (!args.where) return { totalDocs: 500 } // Total
        if (args.where.status?.equals === 'pending_admin_review') return { totalDocs: 25 }
        if (args.where.status?.equals === 'confirmed') return { totalDocs: 350 }
        if (args.where.paymentStatus?.in) return { totalDocs: 125 }
        return { totalDocs: 0 }
      }),
    }

    const testUser = { id: 'admin_usr_bk_1', role: 'admin' }

    const res = await UniversalKpiStrip({
      payload: mockPayload,
      collectionSlug: 'bookings',
      user: testUser,
      overrideAccess: false,
    })

    expect(res).not.toBeNull()
    const metrics = (res as any).props?.metrics
    expect(metrics).toHaveLength(4)

    // Total Bookings
    expect(metrics[0].id).toBe('total')
    expect(metrics[0].value).toBe(500)

    // Pending Admin Review
    expect(metrics[1].id).toBe('pending_review')
    expect(metrics[1].value).toBe(25)
    expect(metrics[1].whereFilter).toEqual({ status: { equals: 'pending_admin_review' } })

    // Confirmed
    expect(metrics[2].id).toBe('confirmed')
    expect(metrics[2].value).toBe(350)
    expect(metrics[2].percentage).toBe(70)
    expect(metrics[2].whereFilter).toEqual({ status: { equals: 'confirmed' } })

    // Outstanding
    expect(metrics[3].id).toBe('outstanding')
    expect(metrics[3].value).toBe(125)
    expect(metrics[3].percentage).toBe(25)
    expect(metrics[3].whereFilter).toEqual({ paymentStatus: { in: ['unpaid', 'partially_paid'] } })

    expect(mockPayload.count).toHaveBeenCalledTimes(4)
    for (const call of countCalls) {
      expect(call.collection).toBe('bookings')
      expect(call.overrideAccess).toBe(false)
      expect(call.user).toEqual(testUser)
    }
  })

  it('GATE 3: Rigorous Filter Sequence — Outstanding -> Confirmed -> Outstanding -> Pending -> Confirmed -> Total -> Outstanding', () => {
    const steps = [
      { name: '1. Outstanding', field: 'paymentStatus', val: { in: ['unpaid', 'partially_paid'] }, expectedKey: 'paymentStatus' },
      { name: '2. Confirmed', field: 'status', val: { equals: 'confirmed' }, expectedKey: 'status' },
      { name: '3. Outstanding', field: 'paymentStatus', val: { in: ['unpaid', 'partially_paid'] }, expectedKey: 'paymentStatus' },
      { name: '4. Pending Admin Review', field: 'status', val: { equals: 'pending_admin_review' }, expectedKey: 'status' },
      { name: '5. Confirmed', field: 'status', val: { equals: 'confirmed' }, expectedKey: 'status' },
      { name: '6. Total (Reset)', field: null, val: null, expectedKey: 'empty' },
      { name: '7. Outstanding', field: 'paymentStatus', val: { in: ['unpaid', 'partially_paid'] }, expectedKey: 'paymentStatus' },
    ]

    let currentWhere: any = undefined

    for (const step of steps) {
      if (step.field) {
        if (step.field === 'status') {
          currentWhere = composeWhere(currentWhere, 'paymentStatus', null)
        } else if (step.field === 'paymentStatus') {
          currentWhere = composeWhere(currentWhere, 'status', null)
        }
        currentWhere = composeWhere(currentWhere, step.field, step.val)
      } else {
        currentWhere = undefined
      }

      const clauseMap = extractClauseMap(currentWhere)
      const activeKeys = Array.from(clauseMap.keys()).sort().join(':') || 'empty'
      expect(activeKeys).toBe(step.expectedKey)

      // CRITICAL INVARIANT: status field must NEVER have unpaid or partially_paid
      const statusCondition = clauseMap.get('status')
      if (statusCondition) {
        const json = JSON.stringify(statusCondition)
        expect(json.includes('unpaid')).toBe(false)
        expect(json.includes('partially_paid')).toBe(false)
      }

      // CRITICAL INVARIANT: paymentStatus field must NEVER have confirmed or pending
      const paymentCondition = clauseMap.get('paymentStatus')
      if (paymentCondition) {
        const json = JSON.stringify(paymentCondition)
        expect(json.includes('confirmed')).toBe(false)
        expect(json.includes('pending_admin_review')).toBe(false)
      }
    }
  })

  it('GATE 4: Cache Isolation — Different users and different collections maintain strict partition', async () => {
    let callCount = 0
    const mockPayload: any = {
      count: vi.fn(async () => {
        callCount++
        return { totalDocs: 10 }
      }),
    }

    const userA = { id: `usr_iso_A_${Date.now()}` }
    const userB = { id: `usr_iso_B_${Date.now()}` }

    // User A fetches experiences
    await UniversalKpiStrip({ payload: mockPayload, collectionSlug: 'experiences', user: userA })
    const callsAfterUserAExp = callCount
    expect(callsAfterUserAExp).toBe(4) // 4 descriptors for experiences

    // User A fetches experiences AGAIN (within 30s) -> hits cache, 0 additional calls
    await UniversalKpiStrip({ payload: mockPayload, collectionSlug: 'experiences', user: userA })
    expect(callCount).toBe(callsAfterUserAExp)

    // User B fetches experiences -> separate cache key, executes 4 new count queries
    await UniversalKpiStrip({ payload: mockPayload, collectionSlug: 'experiences', user: userB })
    expect(callCount).toBe(callsAfterUserAExp + 4)

    // User A fetches BOOKINGS -> separate collection key, executes 4 new count queries
    await UniversalKpiStrip({ payload: mockPayload, collectionSlug: 'bookings', user: userA })
    expect(callCount).toBe(callsAfterUserAExp + 8)
  })

  it('GATE 5: BulkActionBar Architectural Boundaries & Capabilities Contract', async () => {
    // 1. Experiences capability contract allows native generic bulk edit
    expect(experiencesPresentation.capabilities?.bulkEdit).toBe(true)
    expect(experiencesPresentation.capabilities?.bulkActions).toBe(true)

    // 2. Bookings capability contract strictly disables generic bulk edit to protect domain lifecycle
    expect(bookingsPresentation.capabilities?.bulkEdit).toBe(false)
    expect(bookingsPresentation.capabilities?.bulkActions).toBe(true)

    // 3. Verify clean barrel export in bulk/index.ts (zero logic, strictly barrel export)
    const fs = await import('fs')
    const path = await import('path')
    const bulkIndexContent = fs.readFileSync(
      path.join(__dirname, '../src/components/admin/universal-table/bulk/index.ts'),
      'utf-8'
    )
    expect(bulkIndexContent.includes("export { BulkActionBar")).toBe(true)
    expect(bulkIndexContent.includes('executeBulkEdit')).toBe(false)
    expect(bulkIndexContent.includes('resolveBulkAction')).toBe(false)
    expect(bulkIndexContent.includes('engine')).toBe(false)
    const bulkActionBarCode = fs.readFileSync(
      path.join(__dirname, '../src/components/admin/universal-table/bulk/BulkActionBar.tsx'),
      'utf-8'
    )
    expect(bulkActionBarCode.includes("collectionSlug === 'bookings'")).toBe(false)
    expect(bulkActionBarCode.includes("collectionSlug === 'experiences'")).toBe(false)
    expect(bulkActionBarCode.includes("collection.slug === 'bookings'")).toBe(false)
    expect(bulkActionBarCode.includes("collection.slug === 'experiences'")).toBe(false)

    // 5. Invariant: No custom mutation engines in bulk directory
    const bulkFiles = fs.readdirSync(
      path.join(__dirname, '../src/components/admin/universal-table/bulk')
    )
    for (const file of bulkFiles) {
      expect(file).not.toMatch(/engine|mutation|service|manager|state-machine/i)
    }
  })
})

