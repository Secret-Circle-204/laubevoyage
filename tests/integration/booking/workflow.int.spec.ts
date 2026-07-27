import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'
import { BookableDeparture } from '@/domains/experience/bookable-departure'
import { BookingStatus } from '@/types'

describe('Layer 5: BookingWorkflowEngine Integration Tests', () => {
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

  it('should execute full checkout workflow creating draft booking with holds & snapshot', async () => {
    const mockExperience = {
      id: 12,
      title: 'Luxury Voyage',
      slug: 'luxury-voyage',
      type: 'package',
      city: 1,
      price: 5000,
      availability: 'available',
    }
    const mockCustomer = { id: 5, status: 'active', fullName: 'John Doe', preferences: { preferredCurrency: 'EGP' } }

    mockPayload.findByID.mockImplementation(({ collection }: { collection: string }) => {
      if (collection === 'experiences') return Promise.resolve(mockExperience)
      if (collection === 'customers') return Promise.resolve(mockCustomer)
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
            capacityAvailable: 10,
            status: 'available',
          }]
        })
      }
      return Promise.resolve({ docs: [] })
    })

    const mockCreatedDoc = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'draft',
      user: 5,
      experience: 12,
      pricingSnapshot: { totalAmountEGP: 5000, basePriceEGP: 5000, subtotalEGP: 5000, displayCurrency: 'EGP', displayAmount: 5000, exchangeRate: 1, version: 1 },
      timeline: [{ stepKey: 'booking_created', title: 'Booking Created' }],
      auditTrail: [{ action: 'BOOKING_CREATED' }],
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.create.mockResolvedValue(mockCreatedDoc)
    mockPayload.update.mockImplementation((params: any) => Promise.resolve({ ...mockCreatedDoc, ...params.data }))

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

    const result = await workflowEngine.executeCheckoutWorkflow({
      userId: 5,
      departure,
      travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+123456789' }],
      endDate: '2026-08-05',
      currency: 'EGP',
      source: 'website',
    })

    expect(result.id).toBe(101)
    expect(result.status).toBe(BookingStatus.DRAFT)
    expect(result.capacityHold).not.toBeNull()
    expect(result.capacityHold?.status).toBe('active')
  })

  it('should execute payment & confirmation workflows successfully', async () => {
    const mockDraftDoc = {
      id: 101,
      bookingNumber: 'LBV-260723-00042',
      status: 'paid',
      user: 5,
      experience: 12,
      pricingSnapshot: { totalAmountEGP: 5000 },
      capacityHold: { holdId: 'h1', status: 'active' },
      paymentAttempts: [],
      timeline: [],
      auditTrail: [],
      travelers: [{ email: 'john@example.com' }],
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }

    mockPayload.findByID.mockResolvedValue(mockDraftDoc)
    mockPayload.update.mockImplementation((params: any) => Promise.resolve({ ...mockDraftDoc, ...params.data }))

    const confirmedBooking = await workflowEngine.executeConfirmationWorkflow(101)

    expect(confirmedBooking.status).toBe(BookingStatus.CONFIRMED)
    expect(confirmedBooking.capacityHold?.status).toBe('committed')
  })
})
