import { describe, it, expect, vi } from 'vitest'
import { extractSlotsPayload } from '@/collections/hooks/extractSlotsPayload'
import { syncDepartureSlots } from '@/collections/hooks/syncDepartureSlots'

describe('DepartureSlotsEditor Hooks Pipeline', () => {
  describe('extractSlotsPayload (beforeChange)', () => {
    it('should extract _slotsPayload into req.context and delete it from data', () => {
      const slotsData = {
        newSlots: [
          { date: '2026-09-01', startTime: '09:00', capacityTotal: 15, basePriceEGP: 3500 },
        ],
        cancelledSlotIds: [],
      }

      const data: Record<string, any> = {
        title: 'Luxor Day Tour',
        type: 'package',
        _slotsPayload: slotsData,
      }

      const req: any = {
        context: {},
      }

      const result = extractSlotsPayload({ data, req } as any)

      // _slotsPayload must be deleted from data so it never touches the DB
      expect(result._slotsPayload).toBeUndefined()
      expect(result.title).toBe('Luxor Day Tour')

      // req.context must contain the extracted pendingSlots
      expect(req.context.pendingSlots).toEqual(slotsData)
    })

    it('should leave data unchanged if _slotsPayload is absent', () => {
      const data: Record<string, any> = { title: 'Cairo Nile Cruise' }
      const req: any = { context: {} }

      const result = extractSlotsPayload({ data, req } as any)

      expect(result).toEqual({ title: 'Cairo Nile Cruise' })
      expect(req.context.pendingSlots).toBeUndefined()
    })
  })

  describe('syncDepartureSlots (afterChange)', () => {
    it('should create new departure slots atomically using req transaction', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: 101 })
      const mockFind = vi.fn()
      const mockUpdate = vi.fn()

      const req: any = {
        payload: {
          create: mockCreate,
          find: mockFind,
          update: mockUpdate,
        },
      }

      const doc: any = { id: 42, title: 'Red Sea Safari' }
      const context: any = {
        pendingSlots: {
          newSlots: [
            { date: '2026-10-01', startTime: '08:00', basePriceEGP: 5000, capacityTotal: 10 },
            { date: '2026-10-15', startTime: '10:00', basePriceEGP: 6000, capacityTotal: 12 },
          ],
          cancelledSlotIds: [],
        },
      }

      const result = await syncDepartureSlots({ doc, req, context } as any)

      expect(result).toBe(doc)
      expect(mockCreate).toHaveBeenCalledTimes(2)
      expect(mockCreate).toHaveBeenNthCalledWith(1, {
        collection: 'departure-slots',
        data: {
          departureId: 'DEP-42-2026-10-01',
          experience: 42,
          date: '2026-10-01',
          startTime: '08:00',
          basePriceEGP: 5000,
          capacityTotal: 10,
          capacityReserved: 0,
          capacitySold: 0,
          capacityAvailable: 10,
          version: 1,
          status: 'available',
        },
        req,
      })
      expect(mockCreate).toHaveBeenNthCalledWith(2, {
        collection: 'departure-slots',
        data: {
          departureId: 'DEP-42-2026-10-15',
          experience: 42,
          date: '2026-10-15',
          startTime: '10:00',
          basePriceEGP: 6000,
          capacityTotal: 12,
          capacityReserved: 0,
          capacitySold: 0,
          capacityAvailable: 12,
          version: 1,
          status: 'available',
        },
        req,
      })
    })

    it('should cancel slots with status=cancelled if no active bookings exist', async () => {
      const mockCreate = vi.fn()
      const mockFind = vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] })
      const mockUpdate = vi.fn().mockResolvedValue({ id: 5, status: 'cancelled' })

      const req: any = {
        payload: {
          create: mockCreate,
          find: mockFind,
          update: mockUpdate,
        },
      }

      const doc: any = { id: 42, title: 'Desert Oasis Tour' }
      const context: any = {
        pendingSlots: {
          newSlots: [],
          cancelledSlotIds: [5],
        },
      }

      await syncDepartureSlots({ doc, req, context } as any)

      expect(mockFind).toHaveBeenCalledWith({
        collection: 'bookings',
        where: {
          departureSlot: { equals: 5 },
          status: { in: ['paid', 'confirmed', 'pending'] },
        },
        limit: 1,
        depth: 0,
        req,
      })

      expect(mockUpdate).toHaveBeenCalledWith({
        collection: 'departure-slots',
        id: 5,
        data: { status: 'cancelled' },
        req,
      })
    })

    it('should throw an error (triggering atomic transaction rollback) if a cancelled slot has active bookings', async () => {
      const mockCreate = vi.fn()
      const mockFind = vi.fn().mockResolvedValue({ totalDocs: 2, docs: [{ id: 'b1' }, { id: 'b2' }] })
      const mockUpdate = vi.fn()

      const req: any = {
        payload: {
          create: mockCreate,
          find: mockFind,
          update: mockUpdate,
        },
      }

      const doc: any = { id: 42, title: 'Pyramids VIP Tour' }
      const context: any = {
        pendingSlots: {
          newSlots: [],
          cancelledSlotIds: [99],
        },
      }

      await expect(syncDepartureSlots({ doc, req, context } as any)).rejects.toThrow(
        'Cannot cancel departure slot (ID: 99): 2 active booking(s) exist.'
      )

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })
})
