import { describe, it, expect, vi } from 'vitest'
import { ChildPolicy } from '@/domains/experience/child-policy'
import { RoomAllocationPolicy } from '@/domains/experience/room-allocation-policy'
import { BookingPricingUseCase } from '@/application/booking/pricing-usecase'
import { PricingFacade } from '@/domains/currency/facade'
import { PricingPipelineEngine } from '@/domains/currency/pipeline'
import type { ExperienceService } from '@/domains/experience/service'
import type { LocalizationService } from '@/domains/localization/service'
import type { PackageExperienceAggregate } from '@/domains/experience/aggregate'
import type { BookableDeparture } from '@/domains/experience/bookable-departure'

describe('Gate 5.2 — Accommodation & Child Pricing Integration Unit Suite', () => {
  // ─── 1. ChildPolicy Pure Domain Invariant Tests ─────────────────────────
  describe('ChildPolicy', () => {
    it('correctly classifies ages into infant, child, and adult without overlap', () => {
      expect(ChildPolicy.classifyAge(0)).toBe('infant')
      expect(ChildPolicy.classifyAge(1)).toBe('infant')
      expect(ChildPolicy.classifyAge(1.9)).toBe('infant')
      expect(ChildPolicy.classifyAge(2)).toBe('child')
      expect(ChildPolicy.classifyAge(6)).toBe('child')
      expect(ChildPolicy.classifyAge(11)).toBe('child')
      expect(ChildPolicy.classifyAge(12)).toBe('adult')
      expect(ChildPolicy.classifyAge(18)).toBe('adult')
    })

    it('rejects negative or invalid ages with clear errors', () => {
      expect(() => ChildPolicy.classifyAge(-1)).toThrow()
      expect(() => ChildPolicy.classifyAge(NaN)).toThrow()
    })

    it('rejects child booking when children are not allowed on package', () => {
      const res = ChildPolicy.validate({
        childrenAllowed: false,
        childAges: [5],
      })
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('Children are not permitted')
    })

    it('rejects a child whose age is 12 or older with instructions to book as Adult', () => {
      const res = ChildPolicy.validate({
        childrenAllowed: true,
        childAges: [12],
      })
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('qualifies as an Adult (12+)')
    })

    it('validates bedding modes: accepts sharing_bed and extra_bed', () => {
      const validRes = ChildPolicy.validate({
        childrenAllowed: true,
        childAges: [3, 7],
        childBeddingModes: ['sharing_bed', 'extra_bed'],
      })
      expect(validRes.valid).toBe(true)

      const invalidRes = ChildPolicy.validate({
        childrenAllowed: true,
        childAges: [3],
        childBeddingModes: ['invalid_bed' as any],
      })
      expect(invalidRes.valid).toBe(false)
      expect(invalidRes.errors[0]).toContain('invalid bedding mode')
    })
  })

  // ─── 2. RoomAllocationPolicy Pure Domain Invariant Tests ────────────────
  describe('RoomAllocationPolicy', () => {
    const allOccupancies = ['single', 'double', 'triple', 'quad'] as const

    it('allocates 1 Adult into 1 Single Room', () => {
      const res = RoomAllocationPolicy.resolveAllocation({
        adultsCount: 1,
        requestedRooms: 1,
        supportedOccupancies: [...allOccupancies],
      })
      expect(res.valid).toBe(true)
      expect(res.allocation).toHaveLength(1)
      expect(res.allocation?.[0]).toEqual({
        roomIndex: 1,
        occupancy: 'single',
        adults: 1,
        children: 0,
      })
    })

    it('allocates 2 Adults into 1 Double Room', () => {
      const res = RoomAllocationPolicy.resolveAllocation({
        adultsCount: 2,
        requestedRooms: 1,
        supportedOccupancies: [...allOccupancies],
      })
      expect(res.valid).toBe(true)
      expect(res.allocation).toHaveLength(1)
      expect(res.allocation?.[0]).toEqual({
        roomIndex: 1,
        occupancy: 'double',
        adults: 2,
        children: 0,
      })
    })

    it('allocates 3 Adults into 1 Triple Room when requested 1 Room', () => {
      const res = RoomAllocationPolicy.resolveAllocation({
        adultsCount: 3,
        requestedRooms: 1,
        supportedOccupancies: [...allOccupancies],
      })
      expect(res.valid).toBe(true)
      expect(res.allocation).toHaveLength(1)
      expect(res.allocation?.[0]).toEqual({
        roomIndex: 1,
        occupancy: 'triple',
        adults: 3,
        children: 0,
      })
    })

    it('rejects 3 Adults in 1 Room if triple occupancy is not supported (Zero silent room override)', () => {
      const res = RoomAllocationPolicy.resolveAllocation({
        adultsCount: 3,
        requestedRooms: 1,
        supportedOccupancies: ['single', 'double'],
      })
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('Triple occupancy is not supported')
    })

    it('allocates 4 Adults into 1 Quad Room when Quad is supported and 1 Room requested', () => {
      const res = RoomAllocationPolicy.resolveAllocation({
        adultsCount: 4,
        requestedRooms: 1,
        supportedOccupancies: [...allOccupancies],
      })
      expect(res.valid).toBe(true)
      expect(res.allocation?.[0]).toEqual({
        roomIndex: 1,
        occupancy: 'quad',
        adults: 4,
        children: 0,
      })
    })

    it('rejects 4 Adults in 1 Room if Quad is not supported', () => {
      const res = RoomAllocationPolicy.resolveAllocation({
        adultsCount: 4,
        requestedRooms: 1,
        supportedOccupancies: ['single', 'double', 'triple'],
      })
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('Quad occupancy is not supported')
    })

    it('allocates 4 Adults into 2 Double Rooms when 2 Rooms requested', () => {
      const res = RoomAllocationPolicy.resolveAllocation({
        adultsCount: 4,
        requestedRooms: 2,
        supportedOccupancies: [...allOccupancies],
      })
      expect(res.valid).toBe(true)
      expect(res.allocation).toHaveLength(2)
      expect(res.allocation?.[0]).toEqual({ roomIndex: 1, occupancy: 'double', adults: 2, children: 0 })
      expect(res.allocation?.[1]).toEqual({ roomIndex: 2, occupancy: 'double', adults: 2, children: 0 })
    })

    it('allocates 5 Adults into 1 Triple + 1 Double when 2 Rooms requested', () => {
      const res = RoomAllocationPolicy.resolveAllocation({
        adultsCount: 5,
        requestedRooms: 2,
        supportedOccupancies: [...allOccupancies],
      })
      expect(res.valid).toBe(true)
      expect(res.allocation).toHaveLength(2)
      expect(res.allocation![0].adults + res.allocation![1].adults).toBe(5)
    })

    // ─── 2b. Smart Room Allocation (Assistant Pattern) Tests ───────────────
    describe('resolveSmartAllocation', () => {
      it('auto-adjusts 5 Adults in 1 requested room to 2 rooms with explanation', () => {
        const res = RoomAllocationPolicy.resolveSmartAllocation({
          adultsCount: 5,
          requestedRooms: 1,
          supportedOccupancies: [...allOccupancies],
        })
        expect(res.valid).toBe(true)
        expect(res.autoAdjusted).toBe(true)
        expect(res.suggestedRooms).toBe(2)
        expect(res.allocation).toHaveLength(2)
        expect(res.adjustmentReason).toContain('5 adults require at least 2 rooms')
      })

      it('auto-adjusts 3 Adults in 1 requested room to 2 rooms when only Single/Double are supported', () => {
        const res = RoomAllocationPolicy.resolveSmartAllocation({
          adultsCount: 3,
          requestedRooms: 1,
          supportedOccupancies: ['single', 'double'],
        })
        expect(res.valid).toBe(true)
        expect(res.autoAdjusted).toBe(true)
        expect(res.suggestedRooms).toBe(2)
        expect(res.allocation).toHaveLength(2)
        expect(res.adjustmentReason).toContain('3 adults require at least 2 rooms')
      })

      it('does not auto-adjust when requested room count is already valid', () => {
        const res = RoomAllocationPolicy.resolveSmartAllocation({
          adultsCount: 2,
          requestedRooms: 1,
          supportedOccupancies: [...allOccupancies],
        })
        expect(res.valid).toBe(true)
        expect(res.autoAdjusted).toBeFalsy()
        expect(res.allocation).toHaveLength(1)
      })

      it('returns friendly recovery guidance when 0 adults provided', () => {
        const res = RoomAllocationPolicy.resolveSmartAllocation({
          adultsCount: 0,
          requestedRooms: 1,
          supportedOccupancies: [...allOccupancies],
        })
        expect(res.valid).toBe(false)
        expect(res.errors[0]).toContain('At least one adult traveler is required')
      })
    })
  })

  // ─── 3. End-to-End BookingPricingUseCase & SSOT Pipeline Tests ──────────
  describe('BookingPricingUseCase & Commercial Calculation', () => {
    const mockRateProvider = {
      getExchangeRate: vi.fn().mockResolvedValue(1.0),
    }
    const pipeline = new PricingPipelineEngine(mockRateProvider as any)
    const facade = new PricingFacade(pipeline)

    const mockLocalizationService = {
      formatPrice: vi.fn().mockImplementation((amountEGP: number) =>
        Promise.resolve({
          baseAmountEGP: amountEGP,
          convertedAmount: amountEGP,
          currencyCode: 'EGP',
          currencySymbol: 'EGP',
          formatted: `${amountEGP.toLocaleString()} EGP`,
          exchangeRate: 1.0,
          decimals: 0,
        }),
      ),
    } as unknown as LocalizationService

    const sampleDeparture: BookableDeparture = {
      experienceId: 100,
      experienceTitle: 'Luxury Cairo & Nile Package',
      experienceType: 'package',
      departureId: 'dep_test_100',
      date: '2026-10-01',
      effectiveBasePrice: 12500,
      status: 'available',
      capacityAvailable: 50,
      capacityTotal: 50,
    }

    const samplePackage: PackageExperienceAggregate = {
      id: 100,
      title: 'Luxury Cairo & Nile Package',
      slug: 'luxury-cairo-nile',
      cityId: 1,
      type: 'package',
      packageMode: 'fixed_date',
      duration: { days: 4, nights: 3 },
      durationDays: 4,
      durationNights: 3,
      price: 12500,
      availability: 'available',
      version: 1,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      childPolicy: {
        childrenAllowed: true,
        childSharingBedPercentage: 50,
        childExtraBedPercentage: 75,
      },
      accommodations: [
        {
          order: 1,
          propertyId: 501,
          property: {
            id: 501,
            cityId: 1,
            name: 'Four Seasons Cairo',
            slug: 'four-seasons-cairo',
            type: 'hotel',
            isActive: true,
          },
          nights: 2,
          roomCategory: 'Deluxe Nile View',
          boardBasis: 'bed_and_breakfast',
          occupancyOptions: [
            { occupancy: 'single', guestCount: 1, supplementEGP: 3000, isDefault: false },
            { occupancy: 'double', guestCount: 2, supplementEGP: 0, isDefault: true },
            { occupancy: 'triple', guestCount: 3, supplementEGP: 1500, isDefault: false },
            { occupancy: 'quad', guestCount: 4, supplementEGP: 2000, isDefault: false },
          ],
        },
        {
          order: 2,
          propertyId: 502,
          property: {
            id: 502,
            cityId: 1,
            name: 'Sonesta Nile Goddess Cruise',
            slug: 'sonesta-cruise',
            type: 'cruise',
            isActive: true,
          },
          nights: 1,
          roomCategory: 'Presidential Suite',
          boardBasis: 'full_board',
          occupancyOptions: [
            { occupancy: 'single', guestCount: 1, supplementEGP: 2000, isDefault: false },
            { occupancy: 'double', guestCount: 2, supplementEGP: 0, isDefault: true },
            { occupancy: 'triple', guestCount: 3, supplementEGP: 1000, isDefault: false },
            { occupancy: 'quad', guestCount: 4, supplementEGP: 1500, isDefault: false },
          ],
        },
      ],
    }

    const mockExperienceService = {
      resolveBookableDepartureBySlot: vi.fn().mockResolvedValue(sampleDeparture),
      getById: vi.fn().mockResolvedValue(samplePackage),
    } as unknown as ExperienceService

    const useCase = new BookingPricingUseCase(
      mockExperienceService,
      facade,
      mockLocalizationService,
    )

    const testCtx = {
      locale: 'en',
      language: 'en',
      currency: 'EGP',
      timezone: 'UTC',
      country: 'EG',
    } as any

    it('calculates Solo Traveler: Base Price (12,500) + Multi-Stay Single Supplements (3,000 + 2,000) = 17,500 EGP', async () => {
      const result = await useCase.calculate({
        experienceId: 100,
        slotId: 999,
        adultsCount: 1,
        requestedRooms: 1,
        ctx: testCtx,
      })

      expect(result.snapshot.basePriceEGP).toBe(17500)
      expect(result.snapshot.totalAmountEGP).toBe(17500)
      expect(result.snapshot.commercialBreakdown?.adultsTotalEGP).toBe(12500)
      expect(result.snapshot.commercialBreakdown?.occupancySupplementsTotalEGP).toBe(5000)
      expect(result.snapshot.commercialBreakdown?.roomAllocation).toEqual([
        { roomIndex: 1, occupancy: 'single', adults: 1, children: 0 },
      ])
    })

    it('calculates 2 Adults in Double Room: 2 × 12,500 = 25,000 EGP (0 supplement baseline)', async () => {
      const result = await useCase.calculate({
        experienceId: 100,
        slotId: 999,
        adultsCount: 2,
        requestedRooms: 1,
        ctx: testCtx,
      })

      expect(result.snapshot.basePriceEGP).toBe(25000)
      expect(result.snapshot.totalAmountEGP).toBe(25000)
      expect(result.snapshot.commercialBreakdown?.occupancySupplementsTotalEGP).toBe(0)
      expect(result.snapshot.commercialBreakdown?.roomAllocation).toEqual([
        { roomIndex: 1, occupancy: 'double', adults: 2, children: 0 },
      ])
    })

    it('calculates 3 Adults in Triple Room: (3 × 12,500) + Multi-Stay Triple Adjustments (1,500 + 1,000) = 40,000 EGP', async () => {
      const result = await useCase.calculate({
        experienceId: 100,
        slotId: 999,
        adultsCount: 3,
        requestedRooms: 1,
        ctx: testCtx,
      })

      // 3 adults base: 37,500 EGP + Stay 1 Triple Adj (1,500) + Stay 2 Triple Adj (1,000) = 40,000 EGP
      expect(result.snapshot.basePriceEGP).toBe(40000)
      expect(result.snapshot.totalAmountEGP).toBe(40000)
      expect(result.snapshot.commercialBreakdown?.adultsTotalEGP).toBe(37500)
      expect(result.snapshot.commercialBreakdown?.occupancySupplementsTotalEGP).toBe(2500)
      expect(result.snapshot.commercialBreakdown?.roomAllocation).toEqual([
        { roomIndex: 1, occupancy: 'triple', adults: 3, children: 0 },
      ])
    })

    it('calculates 2 Adults + 1 Infant (< 2 yrs): Infant is 0 EGP', async () => {
      const result = await useCase.calculate({
        experienceId: 100,
        slotId: 999,
        adultsCount: 2,
        childrenCount: 1,
        childAges: [1],
        requestedRooms: 1,
        ctx: testCtx,
      })

      expect(result.snapshot.basePriceEGP).toBe(25000)
      expect(result.snapshot.commercialBreakdown?.childrenTotalEGP).toBe(0)
      expect(result.snapshot.commercialBreakdown?.children?.[0]).toEqual({
        age: 1,
        category: 'infant',
        beddingMode: 'sharing_bed',
        appliedPercentage: 0,
        priceEGP: 0,
      })
    })

    it('calculates 2 Adults + 1 Child (6 yrs, Sharing Bed 50%): 25,000 + 6,250 = 31,250 EGP', async () => {
      const result = await useCase.calculate({
        experienceId: 100,
        slotId: 999,
        adultsCount: 2,
        childrenCount: 1,
        childAges: [6],
        childBeddingModes: ['sharing_bed'],
        requestedRooms: 1,
        ctx: testCtx,
      })

      expect(result.snapshot.basePriceEGP).toBe(31250)
      expect(result.snapshot.commercialBreakdown?.childrenTotalEGP).toBe(6250)
      expect(result.snapshot.commercialBreakdown?.children?.[0]).toEqual({
        age: 6,
        category: 'child',
        beddingMode: 'sharing_bed',
        appliedPercentage: 50,
        priceEGP: 6250,
      })
    })

    it('calculates 2 Adults + 1 Child (8 yrs, Extra Bed 75%): 25,000 + 9,375 = 34,375 EGP', async () => {
      const result = await useCase.calculate({
        experienceId: 100,
        slotId: 999,
        adultsCount: 2,
        childrenCount: 1,
        childAges: [8],
        childBeddingModes: ['extra_bed'],
        requestedRooms: 1,
        ctx: testCtx,
      })

      expect(result.snapshot.basePriceEGP).toBe(34375)
      expect(result.snapshot.commercialBreakdown?.childrenTotalEGP).toBe(9375)
      expect(result.snapshot.commercialBreakdown?.children?.[0]).toEqual({
        age: 8,
        category: 'child',
        beddingMode: 'extra_bed',
        appliedPercentage: 75,
        priceEGP: 9375,
      })
    })

    it('freezes commercial facts into immutable snapshot structure', async () => {
      const result = await useCase.calculate({
        experienceId: 100,
        slotId: 999,
        adultsCount: 4,
        requestedRooms: 2,
        ctx: testCtx,
      })

      expect(result.snapshot.commercialBreakdown).toBeDefined()
      expect(result.snapshot.commercialBreakdown?.roomCount).toBe(2)
      expect(result.snapshot.commercialBreakdown?.roomAllocation).toHaveLength(2)
      expect(result.snapshot.commercialBreakdown?.staysBreakdown).toHaveLength(2)
    })
  })
})
