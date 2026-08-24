import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExperienceRepository } from '@/domains/experience/repository'
import { BookingStatus } from '@/types'

describe('Departure Slot Cancellation Hook & Query Integrity', () => {
  let repository: ExperienceRepository
  let payloadMock: any

  beforeEach(() => {
    payloadMock = {
      find: vi.fn(),
      findByID: vi.fn().mockResolvedValue({
        id: 13,
        departureId: 'DEP-10-2026-08-20-0900',
        experience: 10,
        date: '2026-08-20',
        capacityTotal: 20,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 20,
        version: 1,
        status: 'available',
      }),
      update: vi.fn(),
      db: {
        pool: {
          query: vi.fn().mockResolvedValue({ rowCount: 1 }),
        },
      },
    }

    repository = new ExperienceRepository(payloadMock)
  })

  it('Cancellation query uses canonical BookingStatus enums and blocks when active bookings exist', async () => {
    // Mock slot exists
    payloadMock.find.mockImplementation((params: any) => {
      if (params.collection === 'departure-slots') {
        return Promise.resolve({
          totalDocs: 1,
          docs: [
            {
              id: 13,
              departureId: 'DEP-10-2026-08-20-0900',
              experience: 10,
              date: '2026-08-20',
              capacityTotal: 20,
              capacityReserved: 0,
              capacitySold: 0,
              capacityAvailable: 20,
              version: 1,
              status: 'available',
            },
          ],
        })
      }
      if (params.collection === 'bookings') {
        // Assert: Query uses valid enum array, NOT bare 'pending'
        const expectedStatuses = [
          BookingStatus.PAID,
          BookingStatus.CONFIRMED,
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.COMPLETED,
        ]
        expect(params.where.status.in).toEqual(expectedStatuses)
        return Promise.resolve({
          totalDocs: 1,
          docs: [{ id: 100, status: BookingStatus.CONFIRMED }],
        })
      }
      return Promise.resolve({ totalDocs: 0, docs: [] })
    })

    await expect(repository.cancelDepartureSlotAdmin(13, 1)).rejects.toThrow(
      'Cannot cancel departure slot #13: 1 active booking(s) exist. Must refund/cancel bookings first.',
    )
  })

  it('Cancellation succeeds with version bump when no active bookings exist', async () => {
    payloadMock.find.mockImplementation((params: any) => {
      if (params.collection === 'departure-slots') {
        return Promise.resolve({
          totalDocs: 1,
          docs: [
            {
              id: 13,
              departureId: 'DEP-10-2026-08-20-0900',
              experience: 10,
              date: '2026-08-20',
              capacityTotal: 20,
              capacityReserved: 0,
              capacitySold: 0,
              capacityAvailable: 20,
              version: 1,
              status: 'available',
            },
          ],
        })
      }
      if (params.collection === 'bookings') {
        return Promise.resolve({ totalDocs: 0, docs: [] })
      }
      return Promise.resolve({ totalDocs: 0, docs: [] })
    })

    payloadMock.update.mockResolvedValue({
      id: 13,
      departureId: 'DEP-10-2026-08-20-0900',
      status: 'cancelled',
      version: 2,
    })

    const cancelledSlot = await repository.cancelDepartureSlotAdmin(13, 1)
    expect(cancelledSlot.status).toBe('cancelled')
    expect(cancelledSlot.version).toBe(2)
  })
})
