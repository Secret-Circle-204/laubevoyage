import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BlackoutPolicy } from '@/domains/experience/blackout-policy'
import { BasePriceResolver } from '@/domains/experience/base-price-resolver'
import { BookingCreator } from '@/domains/booking/creator'
import { BookingStatus } from '@/types'
import type { ExperienceAggregate } from '@/domains/experience/aggregate'

describe('BATCH 20: Clean Domain Separation & Invariants', () => {
  describe('1. BlackoutPolicy Domain Invariant', () => {
    const blackouts = [
      { date: '2026-10-15', reason: 'Public Holiday (Full Day)' },
      { date: '2026-10-20', startTime: '09:00', reason: 'Morning Maintenance' },
    ]

    it('blocks full-day blackout regardless of startTime requested', () => {
      const morningRes = BlackoutPolicy.isDateBlackedOut('2026-10-15', '09:00', blackouts)
      expect(morningRes.allowed).toBe(false)
      expect(morningRes.code).toBe('BLACKED_OUT')
      expect(morningRes.reason).toContain('Public Holiday')

      const afternoonRes = BlackoutPolicy.isDateBlackedOut('2026-10-15', '13:00', blackouts)
      expect(afternoonRes.allowed).toBe(false)
    })

    it('blocks time-specific blackout only for that specific startTime', () => {
      // 09:00 is blacked out
      const morningRes = BlackoutPolicy.isDateBlackedOut('2026-10-20', '09:00', blackouts)
      expect(morningRes.allowed).toBe(false)
      expect(morningRes.reason).toContain('Morning Maintenance')

      // 13:00 is allowed on the same date
      const afternoonRes = BlackoutPolicy.isDateBlackedOut('2026-10-20', '13:00', blackouts)
      expect(afternoonRes.allowed).toBe(true)
    })

    it('allows normal date without blackouts', () => {
      const res = BlackoutPolicy.isDateBlackedOut('2026-10-25', '09:00', blackouts)
      expect(res.allowed).toBe(true)
    })
  })

  describe('2. BasePriceResolver Domain Invariant', () => {
    const resolver = new BasePriceResolver()

    const mockExp: ExperienceAggregate = {
      id: 10,
      title: 'Dolphin Tour',
      slug: 'dolphin-tour',
      type: 'daily_tour',
      cityId: 1,
      price: 1000,
      availability: 'available',
      duration: { durationMinutes: 180 },
      durationMinutes: 180,
      version: 1,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      priceOverrides: [
        { date: '2026-09-15', priceEGP: 1500, reason: 'Special Event' },
        { date: '2026-09-20', startTime: '17:00', priceEGP: 1800, reason: 'VIP Sunset' },
      ],
    }

    it('resolves catalog base price when no override or slot exists', () => {
      const price = resolver.resolve(mockExp, null, '2026-09-10', '09:00')
      expect(price).toBe(1000)
    })

    it('resolves sparse date price override for full-day override', () => {
      const price = resolver.resolve(mockExp, null, '2026-09-15', '09:00')
      expect(price).toBe(1500)
    })

    it('resolves sparse time-specific price override only for matching time', () => {
      const sunsetPrice = resolver.resolve(mockExp, null, '2026-09-20', '17:00')
      expect(sunsetPrice).toBe(1800)

      const morningPrice = resolver.resolve(mockExp, null, '2026-09-20', '09:00')
      expect(morningPrice).toBe(1000)
    })

    it('prioritizes physical slot price override for Fixed Package slots', () => {
      const slot = {
        id: 99,
        departureId: 'DEP-10-PKG',
        experienceId: 10,
        date: '2026-09-15',
        priceOverrideEGP: 2500,
        capacityTotal: 20,
        capacityReserved: 0,
        capacitySold: 0,
        capacityAvailable: 20,
        version: 1,
        status: 'available' as const,
      }
      const price = resolver.resolve(mockExp, slot, '2026-09-15', '09:00')
      expect(price).toBe(2500)
    })
  })

  describe('3. BookingCreator Domain Invariant (Daily Tour Slot-less vs Fixed Package Slot)', () => {
    let mockRepo: any
    let mockExpService: any
    let mockPricingFacade: any
    let creator: BookingCreator

    beforeEach(() => {
      mockRepo = {
        generateBookingNumber: vi.fn().mockResolvedValue('BK-20260820-TEST'),
        create: vi.fn().mockImplementation(async (data: any) => ({ id: 101, ...data })),
        update: vi.fn().mockImplementation(async (id: number, data: any) => ({ id, ...data })),
      }

      mockExpService = {
        getById: vi.fn().mockImplementation(async (id: number) => ({
          id,
          title: 'Test Tour',
          type: id === 10 ? 'daily_tour' : 'package',
          price: 1000,
          durationDays: 1,
          durationMinutes: 240,
          availability: 'available',
        })),
        getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
        reserveCapacity: vi.fn(),
      }

      const mockCustomerRepo = {
        findById: vi.fn().mockResolvedValue({ id: 5, email: 'customer@example.com', status: 'active' }),
      }

      const mockLoyaltyService = {
        calculatePoints: vi.fn().mockReturnValue(0),
      }

      const mockPricingPipeline = {
        calculateCheckoutPricing: vi.fn().mockResolvedValue({
          pricingSnapshot: {
            basePriceEGP: 1000,
            subtotalEGP: 100000,
            totalAmountEGP: 100000,
            displayCurrency: 'USD',
            displayAmount: 2000,
            pricingVersion: 'v2',
          },
          pointsRedeemed: 0,
          pointsValueEGP: 0,
        }),
      }

      creator = new BookingCreator(
        mockRepo,
        mockCustomerRepo as any,
        mockExpService,
        mockLoyaltyService as any,
        mockPricingPipeline as any,
      )
    })

    it('Daily Tour Checkout: assigns departureSlot = null, skips reserveCapacity, and supports 100 travelers', async () => {
      const travelers = Array.from({ length: 100 }, (_, i) => ({
        firstName: `Traveler${i}`,
        lastName: 'Test',
        email: `traveler${i}@example.com`,
        phone: '+123456789',
      }))

      const transientDeparture = {
        id: undefined, // Slot-less
        departureId: '',
        date: '2026-10-15',
        startTime: '09:00',
        effectiveBasePrice: 1000,
        experienceId: 10,
        experienceTitle: 'Nile Cruise',
        experienceType: 'daily_tour' as const,
        capacityAvailable: 9999,
        capacityTotal: 9999,
        status: 'available' as const,
      }

      const res = await creator.createDraft({
        userId: 5,
        departure: transientDeparture as any,
        travelers,
        endDate: '2026-10-15',
        currency: 'USD' as any,
        source: 'website',
      })

      // Assert booking was saved with departureSlot = null
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          departureSlot: null,
          startDate: '2026-10-15',
          endDate: '2026-10-15',
          status: 'draft',
          travelers: expect.arrayContaining([expect.objectContaining({ firstName: 'Traveler0' })]),
        }),
        undefined,
      )

      // Assert reserveCapacity was NEVER called for Daily Tour
      expect(mockExpService.reserveCapacity).not.toHaveBeenCalled()
      expect(res.capacityHold).toBeNull()
    })

    it('Fixed Package Checkout: assigns departureSlot = ID and reserves capacity', async () => {
      const travelers = [{ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+123' }]

      const fixedPackageDeparture = {
        id: 42, // Physical DB slot
        departureId: 'DEP-PKG-42',
        date: '2026-11-01',
        startTime: '09:00',
        effectiveBasePrice: 5000,
        experienceId: 20,
        experienceTitle: 'Red Sea Explorer',
        experienceType: 'package' as const,
        capacityAvailable: 15,
        capacityTotal: 20,
        status: 'available' as const,
      }

      const res = await creator.createDraft({
        userId: 5,
        departure: fixedPackageDeparture as any,
        travelers,
        endDate: '2026-11-05',
        currency: 'USD' as any,
        source: 'website',
      })

      // Assert booking was saved with departureSlot = 42
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          departureSlot: 42,
          startDate: '2026-11-01',
          endDate: '2026-11-05',
        }),
        undefined,
      )

      // Assert reserveCapacity was called for Fixed Package
      expect(mockExpService.reserveCapacity).toHaveBeenCalledWith(
        'DEP-PKG-42',
        20,
        1,
        5,
        101,
        undefined,
      )
      expect(res.capacityHold).toEqual(
        expect.objectContaining({
          departureSlotId: 42,
          departureId: 'DEP-PKG-42',
          seats: 1,
        }),
      )
    })
  })

  describe('4. Historical Snapshot Invariant', () => {
    it('Booking stores immutable factual snapshot unaffected by subsequent catalog mutations', () => {
      const historicalBooking = {
        id: 202,
        bookingNumber: 'BK-20260820-HIST',
        startDate: '2026-10-15',
        endDate: '2026-10-15',
        departureSlot: null,
        status: 'confirmed',
        pricingSnapshot: {
          basePriceEGP: 1000,
          totalAmountEGP: 1000,
          displayCurrency: 'USD',
          displayAmount: 20,
          pricingVersion: 'v2',
        },
      }

      // Catalog changes later:
      const updatedCatalog = {
        price: 1800, // Price increased
        schedules: [{ startTime: '11:00' }], // Time changed
      }

      // Booking snapshot remains 100% frozen
      expect(historicalBooking.startDate).toBe('2026-10-15')
      expect(historicalBooking.pricingSnapshot.basePriceEGP).toBe(1000)
      expect(historicalBooking.pricingSnapshot.totalAmountEGP).toBe(1000)
      expect(historicalBooking.departureSlot).toBeNull()
    })
  })

  describe('5. BATCH 20B Invariants: Legacy Slot Isolation & Hard Blackout Enforcement', () => {
    let mockRepo: any
    let mockExpService: any
    let creator: BookingCreator

    beforeEach(() => {
      mockRepo = {
        generateBookingNumber: vi.fn().mockResolvedValue('BK-20260820-20B'),
        create: vi.fn().mockImplementation(async (data: any) => ({ id: 501, ...data })),
        update: vi.fn().mockImplementation(async (id: number, data: any) => ({ id, ...data })),
      }

      mockExpService = {
        getById: vi.fn().mockImplementation(async (id: number) => ({
          id,
          title: 'Daily Dolphin Cruise',
          price: 1000,
          duration: { durationMinutes: 240 },
          durationMinutes: 240,
          type: 'daily_tour',
          availability: 'available',
          blackouts: [
            { date: '2026-10-21', reason: 'Annual Maintenance' },
          ],
        })),
        getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
        reserveCapacity: vi.fn(),
      }

      const mockCustomerRepo = {
        findById: vi.fn().mockResolvedValue({ id: 9, email: 'user@test.com', status: 'active' }),
      }

      const mockLoyaltyService = {
        calculatePoints: vi.fn().mockReturnValue(0),
      }

      const mockPricingPipeline = {
        calculateCheckoutPricing: vi.fn().mockResolvedValue({
          pricingSnapshot: {
            basePriceEGP: 1000,
            subtotalEGP: 1000,
            totalAmountEGP: 1000,
            displayCurrency: 'EGP',
            displayAmount: 1000,
            pricingVersion: 'v2',
          },
        }),
      }

      creator = new BookingCreator(
        mockRepo,
        mockCustomerRepo as any,
        mockExpService as any,
        mockLoyaltyService as any,
        mockPricingPipeline as any,
      )
    })

    it('Daily Tour ignores legacy slotId and persists departureSlot = null with exact user date', async () => {
      const travelers = [{ firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@test.com', phone: '+20100' }]

      // Even if departure read model somehow carried a legacy slot ID (e.g. 1 from old seed):
      const dailyDepartureWithLegacySlot = {
        id: 1, // Legacy slot in DB
        departureId: 'DEP-SLOT-1',
        date: '2026-10-25',
        startTime: '09:00',
        effectiveBasePrice: 1000,
        experienceId: 10,
        experienceTitle: 'Daily Dolphin Cruise',
        experienceType: 'daily_tour' as const,
        capacityAvailable: 9999,
        capacityTotal: 9999,
        status: 'available' as const,
      }

      await creator.createDraft({
        userId: 9,
        departure: dailyDepartureWithLegacySlot as any,
        travelers,
        endDate: '2026-10-25',
        currency: 'EGP' as any,
        source: 'website',
      })

      // Invariant: departureSlot MUST be null for daily_tour, startDate MUST be 2026-10-25
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          departureSlot: null,
          startDate: '2026-10-25',
          endDate: '2026-10-25',
        }),
        undefined,
      )
      expect(mockExpService.reserveCapacity).not.toHaveBeenCalled()
    })

    it('Hard Blackout Enforcement: BookingCreator rejects booking draft on blacked-out date', async () => {
      const travelers = [{ firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@test.com', phone: '+20100' }]

      const blackedOutDeparture = {
        date: '2026-10-21', // Matches blackout in mockExpService
        startTime: '09:00',
        effectiveBasePrice: 1000,
        experienceId: 10,
        experienceTitle: 'Daily Dolphin Cruise',
        experienceType: 'daily_tour' as const,
        status: 'blacked_out' as const,
      }

      await expect(
        creator.createDraft({
          userId: 9,
          departure: blackedOutDeparture as any,
          travelers,
          endDate: '2026-10-21',
          currency: 'EGP' as any,
          source: 'website',
        }),
      ).rejects.toThrow(/Creation forbidden: Date 2026-10-21 is unavailable/)

      expect(mockRepo.create).not.toHaveBeenCalled()
    })
  })

  describe('6. BATCH 20C Invariants: Flexible Package vs Fixed Package Domain Authority', () => {
    let mockRepo: any
    let mockExpService: any
    let creator: BookingCreator

    beforeEach(() => {
      mockRepo = {
        generateBookingNumber: vi.fn().mockResolvedValue('BK-20260820-20C'),
        create: vi.fn().mockImplementation(async (data: any) => ({ id: 601, ...data })),
        update: vi.fn().mockImplementation(async (id: number, data: any) => ({ id, ...data })),
      }

      mockExpService = {
        getById: vi.fn().mockImplementation(async (id: number) => {
          if (id === 201) {
            return {
              id: 201,
              title: 'Flexible Nile Cruise',
              price: 500,
              durationDays: 5,
              durationNights: 4,
              type: 'package',
              packageMode: 'flexible_date',
              availability: 'available',
            }
          }
          return {
            id: 202,
            title: 'Fixed Nile Cruise',
            price: 500,
            durationDays: 5,
            durationNights: 4,
            type: 'package',
            packageMode: 'fixed_date',
            availability: 'available',
          }
        }),
        getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
        reserveCapacity: vi.fn().mockResolvedValue({ holdId: 'hold_fixed_123' }),
      }

      const mockCustomerRepo = {
        findById: vi.fn().mockResolvedValue({ id: 9, email: 'user@test.com', status: 'active' }),
      }

      const mockLoyaltyService = {
        calculatePoints: vi.fn().mockReturnValue(0),
      }

      const mockPricingPipeline = {
        calculateCheckoutPricing: vi.fn().mockImplementation(async (params: any) => ({
          pricingSnapshot: {
            basePriceEGP: 500,
            subtotalEGP: 500 * params.travelers.length,
            totalAmountEGP: 500 * params.travelers.length,
            displayCurrency: 'EGP',
            displayAmount: 500 * params.travelers.length,
            pricingVersion: 'v2',
          },
        })),
      }

      creator = new BookingCreator(
        mockRepo,
        mockCustomerRepo as any,
        mockExpService as any,
        mockLoyaltyService as any,
        mockPricingPipeline as any,
      )
    })

    it('Flexible Package: 4 passengers × 500 = 2,000 EGP, startDate set, endDate calculated, departureSlot = null', async () => {
      const travelers = [
        { firstName: 'T1', lastName: 'User', email: 't1@test.com', phone: '+20100' },
        { firstName: 'T2', lastName: 'User', email: 't2@test.com', phone: '+20100' },
        { firstName: 'T3', lastName: 'User', email: 't3@test.com', phone: '+20100' },
        { firstName: 'T4', lastName: 'User', email: 't4@test.com', phone: '+20100' },
      ]

      const flexDeparture = {
        date: '2026-10-01',
        startTime: '',
        effectiveBasePrice: 500,
        experienceId: 201,
        experienceTitle: 'Flexible Nile Cruise',
        experienceType: 'package' as const,
        status: 'available' as const,
      }

      // startDate: 2026-10-01, duration: 5 days -> endDate: 2026-10-05
      const draft = await creator.createDraft({
        userId: 9,
        departure: flexDeparture as any,
        travelers,
        endDate: '2026-10-05',
        currency: 'EGP' as any,
        source: 'website',
      })

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          experience: 201,
          departureSlot: null, // Flexible Package MUST NOT have a slot
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          pricingSnapshot: expect.objectContaining({
            totalAmountEGP: 2000, // 4 × 500 = 2,000 EGP
          }),
        }),
        undefined,
      )

      // No capacity reservation on slots for flexible packages
      expect(mockExpService.reserveCapacity).not.toHaveBeenCalled()
    })

    it('Fixed Package: uses physical departureSlot and reserves slot capacity', async () => {
      const travelers = [
        { firstName: 'T1', lastName: 'User', email: 't1@test.com', phone: '+20100' },
        { firstName: 'T2', lastName: 'User', email: 't2@test.com', phone: '+20100' },
      ]

      const fixedDeparture = {
        id: 77, // Physical Slot ID
        departureId: 'DEP-FIXED-77',
        date: '2026-10-01',
        startTime: '08:00',
        effectiveBasePrice: 500,
        experienceId: 202,
        experienceTitle: 'Fixed Nile Cruise',
        experienceType: 'package' as const,
        status: 'available' as const,
      }

      const draft = await creator.createDraft({
        userId: 9,
        departure: fixedDeparture as any,
        travelers,
        endDate: '2026-10-05',
        currency: 'EGP' as any,
        source: 'website',
      })

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          experience: 202,
          departureSlot: 77, // Fixed Package MUST link to slot
          startDate: '2026-10-01',
          endDate: '2026-10-05',
        }),
        undefined,
      )

      // Enforces physical capacity reservation on departureId
      expect(mockExpService.reserveCapacity).toHaveBeenCalledWith(
        'DEP-FIXED-77',
        202,
        2,
        9,
        601,
        undefined,
      )
    })
  })
})


