import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingRepository } from '@/domains/booking/repository'
import { BookingStatus } from '@/types'

describe('Layer 1: BookingRepository Contract Tests', () => {
  let mockPayload: any
  let repository: BookingRepository

  beforeEach(() => {
    mockPayload = {
      create: vi.fn(),
      findByID: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
    }
    repository = new BookingRepository(mockPayload)
  })

  it('should create a booking aggregate and map fields accurately', async () => {
    const mockDoc = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      version: 1,
      source: 'website',
      status: 'draft',
      user: { id: 5 },
      experience: { id: 12 },
      travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+123456789' }],
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      pricingSnapshot: { totalAmountEGP: 5000, displayCurrency: 'EGP', displayAmount: 5000, basePriceEGP: 5000, subtotalEGP: 5000, exchangeRate: 1, version: 1 },
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.create.mockResolvedValue(mockDoc)

    const result = await repository.create(mockDoc)

    expect(mockPayload.create).toHaveBeenCalledWith({
      collection: 'bookings',
      data: mockDoc,
      req: undefined,
    })
    expect(result.id).toBe(101)
    expect(result.bookingNumber).toBe('LBV-260723-00042')
    expect(result.customerId).toBe(5)
    expect(result.experienceId).toBe(12)
    expect(result.status).toBe(BookingStatus.DRAFT)
  })

  it('should find a booking aggregate by ID', async () => {
    const mockDoc = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'confirmed',
      user: 5,
      experience: 12,
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.findByID.mockResolvedValue(mockDoc)

    const result = await repository.findById(101)

    expect(mockPayload.findByID).toHaveBeenCalledWith({
      collection: 'bookings',
      id: 101,
      req: undefined,
    })
    expect(result.id).toBe(101)
    expect(result.status).toBe(BookingStatus.CONFIRMED)
  })

  it('should update booking status exclusively', async () => {
    const mockDoc = {
      id: 101,
      status: 'confirmed',
      user: 5,
      experience: 12,
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.update.mockResolvedValue(mockDoc)

    const result = await repository.updateStatus(101, BookingStatus.CONFIRMED)

    expect(mockPayload.update).toHaveBeenCalledWith({
      collection: 'bookings',
      id: 101,
      data: { status: BookingStatus.CONFIRMED },
      req: undefined,
    })
    expect(result.status).toBe(BookingStatus.CONFIRMED)
  })

  it('should find booking by human-readable booking number', async () => {
    const mockDoc = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      user: 5,
      experience: 12,
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.find.mockResolvedValue({ docs: [mockDoc] })

    const result = await repository.findByBookingNumber('LBV-260723-00042')

    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'bookings',
      where: { bookingNumber: { equals: 'LBV-260723-00042' } },
      limit: 1,
      req: undefined,
    })
    expect(result?.bookingNumber).toBe('LBV-260723-00042')
  })
})
