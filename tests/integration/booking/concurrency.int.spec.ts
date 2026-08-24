import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'
import { BookableDeparture } from '@/domains/experience/bookable-departure'
import { ExperienceService } from '@/domains/experience/service'

import type { CustomerRepository } from '@/domains/customer/repository'

describe('Layer 8: Concurrency & Seat Race Condition Tests', () => {
  let mockPayload: any
  let workflowEngine: BookingWorkflowEngine
  let availableSeats = 2

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    availableSeats = 2

    const mockCustomer = { id: 5, status: 'active', fullName: 'John Doe', preferences: { preferredCurrency: 'EGP' } }
    const mockCustomerRepository = {
      findById: vi.fn().mockResolvedValue(mockCustomer),
    } as unknown as CustomerRepository

    const mockExperienceService = {
      getById: vi.fn().mockImplementation(() => Promise.resolve({
        id: 12,
        title: 'Luxury Voyage',
        slug: 'luxury-voyage',
        type: 'package',
        city: 1,
        price: 5000,
        availability: availableSeats > 0 ? 'available' : 'sold_out',
        duration: { days: 5, nights: 4 },
      })),
      getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
      reserveCapacity: vi.fn().mockResolvedValue(undefined),
    } as unknown as ExperienceService

    workflowEngine = new BookingWorkflowEngine(mockPayload, mockCustomerRepository, mockExperienceService)
  })

  it('should handle concurrent checkout attempts gracefully with capacity checks', async () => {
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
          duration: { days: 5, nights: 4 },
        })
      }
      if (collection === 'customers') {
        return Promise.resolve({ id: 5, status: 'active' })
      }
      if (collection === 'cities') {
        return Promise.resolve({ id: 1, name: 'Cairo', country: { id: 1, timezone: 'Africa/Cairo' } })
      }
      return Promise.resolve(null)
    })

    mockPayload.find.mockImplementation(({ collection }: { collection: string }) => {
      if (collection === 'departure-slots') {
        return Promise.resolve({
          docs: [{
            id: 1,
            departureId: 'dep_12',
            experience: 12,
            date: '2026-10-01',
            capacityTotal: 10,
            capacityReserved: 0,
            capacitySold: 0,
            capacityAvailable: availableSeats,
            version: 1,
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
        paymentWindowExpiresAt: params.data?.paymentWindowExpiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        ...params.data,
      })
    })

    mockPayload.update.mockImplementation((params: any) =>
      Promise.resolve({
        id: params.id,
        paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        ...params.data,
      }),
    )

    const departure = new BookableDeparture({
      id: 1,
      experienceId: 12,
      experienceTitle: 'Luxury Voyage',
      experienceType: 'package',
      departureId: 'dep_12',
      date: '2026-10-01',
      startTime: '08:00',
      effectiveBasePrice: 5000,
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
          endDate: '2026-10-05',
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
