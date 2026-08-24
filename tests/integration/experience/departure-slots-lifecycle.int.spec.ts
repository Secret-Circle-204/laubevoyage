import { describe, it, expect, vi } from 'vitest'
import { extractSlotsPayload } from '@/collections/hooks/extractSlotsPayload'
import { syncDepartureSlots } from '@/collections/hooks/syncDepartureSlots'

describe('Payload Save Pipeline Integration: DepartureSlots Lifecycle', () => {
  it('should run full create pipeline: extract virtual field -> persist doc -> create slots atomically', async () => {
    // 1. Simulate form submission from DepartureSlotsEditor
    const formSubmissionData: Record<string, any> = {
      title: 'Aswan Nile Cruise 4D3N',
      slug: 'aswan-nile-cruise',
      type: 'package',
      city: 2,
      duration: { days: 4, nights: 3 },
      availability: 'available',
      _slotsPayload: {
        newSlots: [
          { date: '2026-11-01', startTime: '09:00', priceOverrideEGP: 12000, capacityTotal: 25 },
          { date: '2026-11-15', startTime: '09:00', priceOverrideEGP: 13000, capacityTotal: 25 },
        ],
        cancelledSlotIds: [],
      },
    }

    const req: any = {
      context: {},
      payload: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: Math.floor(Math.random() * 1000), ...data })),
        find: vi.fn().mockResolvedValue({ docs: [{ id: 2, name: 'Aswan', country: { id: 1, name: 'Egypt', timezone: 'Africa/Cairo' } }] }),
        findByID: vi.fn().mockImplementation(({ collection, id }) => {
          if (collection === 'cities') {
            return Promise.resolve({ id, name: 'Aswan', country: { id: 1, name: 'Egypt', timezone: 'Africa/Cairo' } })
          }
          if (collection === 'countries') {
            return Promise.resolve({ id, name: 'Egypt', timezone: 'Africa/Cairo' })
          }
          return Promise.resolve(null)
        }),
        update: vi.fn(),
      },
    }

    // Step A: beforeChange hook
    const cleanedData = extractSlotsPayload({ data: formSubmissionData, req } as any)

    // Verify virtual field was stripped
    expect(cleanedData._slotsPayload).toBeUndefined()
    expect(req.context.pendingSlots).toBeDefined()
    expect(req.context.pendingSlots.newSlots).toHaveLength(2)

    // Step B: DB Insert simulation (Payload creates the experience document)
    const savedDoc = { id: 88, ...cleanedData }

    // Step C: afterChange hook
    await syncDepartureSlots({ doc: savedDoc, req, context: req.context } as any)

    // Verify slots were created atomically passing `req`
    expect(req.payload.create).toHaveBeenCalledTimes(2)
    expect(req.payload.create).toHaveBeenNthCalledWith(1, {
      collection: 'departure-slots',
      data: expect.objectContaining({
        experience: 88,
        date: '2026-11-01',
        priceOverrideEGP: 12000,
        capacityTotal: 25,
      }),
      req,
    })
    expect(req.payload.create).toHaveBeenNthCalledWith(2, {
      collection: 'departure-slots',
      data: expect.objectContaining({
        experience: 88,
        date: '2026-11-15',
        priceOverrideEGP: 13000,
        capacityTotal: 25,
      }),
      req,
    })
  })

  it('should run update pipeline: cancel existing slot safely when no active bookings exist', async () => {
    const updateSubmissionData: Record<string, any> = {
      title: 'Aswan Nile Cruise 4D3N (Updated)',
      _slotsPayload: {
        newSlots: [
          { date: '2026-12-01', startTime: '10:00', priceOverrideEGP: 14000, capacityTotal: 20 },
        ],
        cancelledSlotIds: [10],
      },
    }

    const req: any = {
      context: {},
      payload: {
        create: vi.fn().mockResolvedValue({ id: 99 }),
        find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }), // No active bookings
        update: vi.fn().mockResolvedValue({ id: 10, status: 'cancelled' }),
      },
    }

    const cleanedData = extractSlotsPayload({ data: updateSubmissionData, req } as any)
    const updatedDoc = { id: 88, ...cleanedData }

    await syncDepartureSlots({ doc: updatedDoc, req, context: req.context } as any)

    // Verify 1 slot created and 1 slot cancelled
    expect(req.payload.create).toHaveBeenCalledTimes(1)
    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'departure-slots',
      id: 10,
      data: { status: 'cancelled' },
      req,
    })
  })

  it('should enforce booking protection: throw error and rollback if slot to be cancelled has active bookings', async () => {
    const cancelWithBookingsData: Record<string, any> = {
      _slotsPayload: {
        newSlots: [],
        cancelledSlotIds: [55],
      },
    }

    const req: any = {
      context: {},
      payload: {
        create: vi.fn(),
        find: vi.fn().mockResolvedValue({ totalDocs: 1, docs: [{ id: 'b_101', status: 'paid' }] }), // Active booking!
        update: vi.fn(),
      },
    }

    const cleanedData = extractSlotsPayload({ data: cancelWithBookingsData, req } as any)
    const doc = { id: 88, title: 'Popular Cairo Tour' }

    await expect(syncDepartureSlots({ doc, req, context: req.context } as any)).rejects.toThrow(
      'Cannot cancel departure slot (ID: 55): 1 active booking(s) exist.'
    )

    // Verify update was never called (transaction aborted)
    expect(req.payload.update).not.toHaveBeenCalled()
  })
})
