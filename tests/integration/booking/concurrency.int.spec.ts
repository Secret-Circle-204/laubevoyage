import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'
import { BookableDeparture } from '@/domains/experience/bookable-departure'

describe('Layer 8: Concurrency & Seat Race Condition Tests', () => {
  let mockPayload: any
  let workflowEngine: BookingWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    workflowEngine = new BookingWorkflowEngine(mockPayload)
  })

  it('should handle concurrent checkout attempts gracefully with capacity checks', async () => {
    let availableSeats = 2
    const totalRequests = 10

    mockPayload.findByID.mockImplementation(({ collection }: { collection: string }) => {
      if (collection === 'experiences') {
        return Promise.resolve({
          id: 12,
          title: 'Luxury Voyage',
          slug: 'luxury-voyage',
          type: 'package',
          city: 1,
          price: 5000,
          availability: availableSeats > 0 ? 'available' : 'sold_out',
        })
      }
      if (collection === 'customers') {
        return Promise.resolve({ id: 5, status: 'active' })
      }
      return Promise.resolve(null)
    })

    mockPayload.find.mockImplementation(({ collection }: { collection: string }) => {
      if (collection === 'departure-slots') {
        return Promise.resolve({
          docs: [{
            id: 1,
            departureId: 'dep-123',
            experience: 12,
            date: '2026-08-01',
            capacityTotal: 10,
            capacityAvailable: availableSeats,
            status: 'available',
          }]
        })
      }
      return Promise.resolve({ docs: [] })
    })

    mockPayload.create.mockImplementation((params: any) => {
      if (availableSeats <= 0) {
        throw new Error('CAPACITY_EXCEEDED: Experience is sold out.')
      }
      availableSeats -= 1
      return Promise.resolve({
        id: Math.floor(Math.random() * 1000),
        bookingNumber: 'LBV-260723-00042',
        status: 'draft',
        ...params.data,
      })
    })

    mockPayload.update.mockImplementation((params: any) => Promise.resolve({ id: params.id, ...params.data }))

    const departure = new BookableDeparture({
      experienceId: 12,
      experienceTitle: 'Luxury Voyage',
      experienceType: 'package',
      departureId: 'dep_12',
      date: '2026-08-01',
      startTime: '08:00',
      basePriceEGP: 5000,
      capacityAvailable: 10,
      capacityTotal: 20,
      status: 'available',
    })

    const checkoutTasks = Array.from({ length: totalRequests }).map(() =>
      workflowEngine
        .executeCheckoutWorkflow({
          userId: 5,
          departure,
          travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+123456789' }],
          endDate: '2026-08-05',
          currency: 'EGP',
          source: 'website',
        })
        .then(() => 'success')
        .catch((err) => err.message),
    )

    const results = await Promise.all(checkoutTasks)

    const successCount = results.filter((r) => r === 'success').length
    const failureCount = results.filter((r) => r !== 'success').length

    expect(successCount).toBe(2)
    expect(failureCount).toBe(8)
    expect(availableSeats).toBe(0)
  })
})
