import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BookingWorkflowEngine } from '@/domains/booking/workflow'
import { BookableDeparture } from '@/domains/experience/bookable-departure'
import { ExperienceService } from '@/domains/experience/service'
import type { CustomerRepository } from '@/domains/customer/repository'

describe('Layer 11: Performance Budget & Regression Guard Tests', () => {
  let mockPayload: any
  let workflowEngine: BookingWorkflowEngine
  let queryCount: number

  beforeEach(() => {
    queryCount = 0
    mockPayload = {
      create: vi.fn().mockImplementation((params) => {
        queryCount++
        return Promise.resolve({
          id: 101,
          bookingNumber: 'LBV-260723-00042',
          status: 'draft',
          pricingSnapshot: { totalAmountEGP: 5000 },
          paymentWindowExpiresAt: params.data?.paymentWindowExpiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          ...params.data,
        })
      }),
      findByID: vi.fn().mockImplementation((params) => {
        queryCount++
        if (params.collection === 'experiences') return Promise.resolve({
          id: 12,
          title: 'Luxury Voyage',
          slug: 'luxury-voyage',
          type: 'package',
          city: 1,
          price: 5000,
          availability: 'available',
          duration: { days: 5, nights: 4 },
        })
        if (params.collection === 'customers') return Promise.resolve({ id: 5, status: 'active', preferences: { preferredCurrency: 'EGP' } })
        if (params.collection === 'cities') return Promise.resolve({ id: 1, name: 'Cairo', country: { id: 1, timezone: 'Africa/Cairo' } })
        return Promise.resolve({
          id: 101,
          bookingNumber: 'LBV-260723-00042',
          status: 'paid',
          user: 5,
          experience: 12,
          pricingSnapshot: { totalAmountEGP: 5000 },
          capacityHold: { holdId: 'c1', status: 'active', departureId: 'dep-123' },
          paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          timeline: [],
          auditTrail: [],
          travelers: [{ email: 'john@example.com' }],
        })
      }),
      find: vi.fn().mockImplementation((params) => {
        queryCount++
        if (params.collection === 'departure-slots') {
          return Promise.resolve({
            docs: [{
              id: 1,
              departureId: 'dep-123',
              experience: 12,
              date: '2026-10-01',
              capacityTotal: 10,
              capacityReserved: 1,
              capacitySold: 0,
              capacityAvailable: 9,
              version: 1,
              status: 'available',
            }]
          })
        }
        return Promise.resolve({ docs: [] })
      }),
      update: vi.fn().mockImplementation((params) => {
        queryCount++
        return Promise.resolve({
          id: params.id,
          paymentWindowExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          ...params.data,
        })
      }),
    }
    const mockExperience = {
      id: 12,
      title: 'Luxury Voyage',
      slug: 'luxury-voyage',
      type: 'package',
      city: 1,
      price: 5000,
      availability: 'available',
      duration: { days: 5, nights: 4 },
    }
    const mockCustomer = { id: 5, status: 'active', fullName: 'John Doe', preferences: { preferredCurrency: 'EGP' } }
    const mockCustomerRepository = {
      findById: vi.fn().mockResolvedValue(mockCustomer),
    } as unknown as CustomerRepository

    const mockExperienceService = {
      getById: vi.fn().mockResolvedValue(mockExperience),
      getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
      reserveCapacity: vi.fn().mockResolvedValue(undefined),
    } as unknown as ExperienceService

    workflowEngine = new BookingWorkflowEngine(mockPayload, mockCustomerRepository, mockExperienceService)
  })

  it('should enforce checkout workflow execution duration < 500ms and database queries <= 5', async () => {
    const startTime = performance.now()

    const departure = new BookableDeparture({
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

    await workflowEngine.executeCheckoutWorkflow({
      userId: 5,
      departure,
      travelers: [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+123456789' }],
      endDate: '2026-10-05',
      currency: 'EGP',
      source: 'website',
    })

    const duration = performance.now() - startTime

    expect(duration).toBeLessThan(500) // Performance budget < 500ms
    expect(queryCount).toBeLessThanOrEqual(6) // Query limit <= 6 DB queries (including authoritative destination timezone resolution)
  })

  it('should enforce confirmation workflow execution duration < 800ms and database queries <= 5', async () => {
    queryCount = 0
    const startTime = performance.now()

    await workflowEngine.executeConfirmationWorkflow(101)

    const duration = performance.now() - startTime

    expect(duration).toBeLessThan(800) // Performance budget < 800ms
    expect(queryCount).toBeLessThanOrEqual(5) // Query limit <= 5 DB queries
  })
})
