import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExperienceDetailsLoader } from '@/application/experience/loaders-details'
import { ExperiencesCatalogLoader } from '@/application/experience/loaders'
import { getApplicationServices } from '@/application/factory'
import { getDomainServices } from '@/domains/factory'

vi.mock('@/application/factory', () => ({
  getApplicationServices: vi.fn(),
}))

vi.mock('@/domains/factory', () => ({
  getDomainServices: vi.fn(),
}))

describe('Application Layer & DTO Contracts: Experience Loaders (BATCH 17B)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ExperienceDetailsLoader (SSOT & Zero Fallback)', () => {
    it('should map aggregate faithfully into ExperienceDetailsDTO including policiesHtml, schedules, and durationNights', async () => {
      const mockExp = {
        id: 10,
        slug: 'nile-cruise-luxury',
        title: 'Nile Cruise Luxury 7 Days',
        type: 'package',
        packageMode: 'fixed_date',
        availability: 'available',
        cityId: 101,
        price: 15000,
        durationDays: 7,
        durationNights: 6,
        policiesHtml: '<p>Free cancellation 48h before departure.</p>',
        schedules: undefined,
        heroUrl: '/media/nile-hero.jpg',
        gallery: ['/media/nile-1.jpg', '/media/nile-2.jpg'],
        itinerary: [
          { dayNumber: 1, title: 'Arrival Luxor', description: 'Check-in and evening tour' },
        ],
        included: ['Breakfast', 'Guided tours'],
        excluded: ['Tips', 'Flights'],
        descriptionHtml: '<p>Experience the luxury of Nile river.</p>',
      }

      const mockSlots = [
        {
          id: 501,
          departureId: 'DEP-10-2026-10-15-0000',
          experienceId: 10,
          date: '2026-10-15',
          priceOverrideEGP: 16500,
          capacityAvailable: 8,
          capacityTotal: 10,
          status: 'available',
        },
      ]

      const mockCity = {
        id: 101,
        name: 'Luxor',
        country: {
          id: 1,
          name: 'Egypt',
        },
      }

      const mockApplicationServices = {
        experience: {
          getBySlug: vi.fn().mockResolvedValue(mockExp),
          getById: vi.fn().mockResolvedValue(mockExp),
          getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
          findSlotsByExperienceId: vi.fn().mockResolvedValue(mockSlots),
          resolveDefaultSlot: vi.fn().mockReturnValue(mockSlots[0]),
        },
        destination: {
          getCityById: vi.fn().mockResolvedValue(mockCity),
          getCountryById: vi.fn().mockResolvedValue({ id: 1, name: 'Egypt' }),
        },
        localization: {
          buildContext: vi.fn().mockResolvedValue({
            language: 'en',
            currency: 'EGP',
            timezone: 'Africa/Cairo',
          }),
          translateBatch: vi.fn().mockImplementation((texts: string[]) => Promise.resolve(texts)),
          formatPrice: vi.fn().mockImplementation((amount: number) =>
            Promise.resolve({
              amount,
              formatted: `${amount} EGP`,
              currency: 'EGP',
              currencySymbol: 'EGP',
            }),
          ),
        },
        bookingPricingUseCase: {
          calculate: vi.fn().mockResolvedValue({
            unitPrice: { baseAmountEGP: 16500, convertedAmount: 16500, formatted: '16,500 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
            totalCost: { baseAmountEGP: 33000, convertedAmount: 33000, formatted: '33,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
          }),
        },
      }

      ;(getApplicationServices as any).mockResolvedValue(mockApplicationServices)

      const dto = await ExperienceDetailsLoader.loadBySlug('nile-cruise-luxury', { adults: 2 })

      expect(dto).not.toBeNull()
      expect(dto?.id).toBe(10)
      expect(dto?.title).toBe('Nile Cruise Luxury 7 Days')
      expect(dto?.durationDays).toBe(7)
      expect(dto?.durationNights).toBe(6)
      expect(dto?.policiesHtml).toBe('<p>Free cancellation 48h before departure.</p>')
      expect(dto?.location).toBe('Luxor, Egypt')
      expect(dto?.destinationTimezone).toBe('Africa/Cairo')
      expect(dto?.images).toEqual(['/media/nile-1.jpg', '/media/nile-2.jpg'])
      expect(dto?.bookability.model).toBe('fixed_package')
      expect(dto?.bookability.isBookable).toBe(true)
      expect((dto?.bookability as any).defaultSlotId).toBe(501)
      expect(dto?.departureSlots).toHaveLength(1)
      expect(dto?.departureSlots?.[0]).toEqual({
        id: 501,
        departureId: 'DEP-10-2026-10-15-0000',
        departureDate: '2026-10-15',
        startTime: undefined,
        availableSeats: 8,
        priceOverrideEGP: 16500,
        status: 'available',
      })
      expect(dto?.pricing?.totalPrice.convertedAmount).toBe(33000)
    })

    it('should return isBookable: false and pricing: null when all fixed package departure slots are in the past', async () => {
      const mockHistoricalExp = {
        id: 53,
        slug: 'historical-package',
        title: 'Historical Experience Past',
        type: 'package',
        packageMode: 'fixed_date',
        availability: 'available',
        cityId: 101,
        price: 16000,
        durationDays: 3,
        durationNights: 2,
        heroUrl: '/media/past.jpg',
      }

      // Past slot
      const mockPastSlots = [
        {
          id: 901,
          departureId: 'DEP-53-2020-01-01-0900',
          experienceId: 53,
          date: '2020-01-01',
          startTime: '09:00',
          priceOverrideEGP: 16000,
          capacityAvailable: 10,
          capacityTotal: 10,
          status: 'available',
        },
      ]

      const mockApplicationServices = {
        experience: {
          getBySlug: vi.fn().mockResolvedValue(mockHistoricalExp),
          getById: vi.fn().mockResolvedValue(mockHistoricalExp),
          getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
          findSlotsByExperienceId: vi.fn().mockResolvedValue(mockPastSlots),
          resolveDefaultSlot: vi.fn().mockReturnValue(null),
        },
        destination: {
          getCityById: vi.fn().mockResolvedValue(null),
        },
        localization: {
          buildContext: vi.fn().mockResolvedValue({ language: 'en', currency: 'EGP', timezone: 'Africa/Cairo' }),
          translateBatch: vi.fn().mockImplementation((texts: string[]) => Promise.resolve(texts)),
          formatPrice: vi.fn().mockImplementation((amount: number) =>
            Promise.resolve({ amount, formatted: `${amount} EGP`, currency: 'EGP', currencySymbol: 'EGP' }),
          ),
        },
        bookingPricingUseCase: {
          calculate: vi.fn(),
          calculatePreview: vi.fn(),
        },
      }

      ;(getApplicationServices as any).mockResolvedValue(mockApplicationServices)

      const dto = await ExperienceDetailsLoader.loadBySlug('historical-package')
      expect(dto).not.toBeNull()
      expect(dto?.bookability.model).toBe('fixed_package')
      expect(dto?.bookability.isBookable).toBe(false)
      expect((dto?.bookability as any).defaultSlotId).toBeNull()
      expect(dto?.pricing).toBeNull()
    })

    it('should resolve flexible package with ZERO departure slots as isBookable: true and valid pricing', async () => {
      const mockFlexibleExp = {
        id: 77,
        slug: 'red-sea-safari-flexible',
        title: 'Red Sea Safari 4 Days Flexible',
        type: 'package',
        packageMode: 'flexible_date',
        availability: 'available',
        cityId: 102,
        price: 8000,
        durationDays: 4,
        durationNights: 3,
        heroUrl: '/media/safari.jpg',
        gallery: [],
        blackouts: [],
      }

      const mockApplicationServices = {
        experience: {
          getBySlug: vi.fn().mockResolvedValue(mockFlexibleExp),
          getById: vi.fn().mockResolvedValue(mockFlexibleExp),
          getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
          findSlotsByExperienceId: vi.fn().mockResolvedValue([]),
          resolveDefaultSlot: vi.fn().mockReturnValue(null),
        },
        destination: {
          getCityById: vi.fn().mockResolvedValue(null),
        },
        localization: {
          buildContext: vi.fn().mockResolvedValue({ language: 'en', currency: 'EGP', timezone: 'Africa/Cairo' }),
          translateBatch: vi.fn().mockImplementation((texts: string[]) => Promise.resolve(texts)),
          formatPrice: vi.fn().mockImplementation((amount: number) =>
            Promise.resolve({ amount, formatted: `${amount} EGP`, currency: 'EGP', currencySymbol: 'EGP' }),
          ),
        },
        bookingPricingUseCase: {
          calculate: vi.fn(),
          calculatePreview: vi.fn().mockResolvedValue({
            unitPrice: { baseAmountEGP: 8000, convertedAmount: 8000, formatted: '8,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
            totalCost: { baseAmountEGP: 16000, convertedAmount: 16000, formatted: '16,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
          }),
        },
      }

      ;(getApplicationServices as any).mockResolvedValue(mockApplicationServices)

      const dto = await ExperienceDetailsLoader.loadBySlug('red-sea-safari-flexible')
      expect(dto).not.toBeNull()
      expect(dto?.type).toBe('package')
      expect((dto as any).packageMode).toBe('flexible_date')
      expect(dto?.bookability.model).toBe('flexible_package')
      expect(dto?.bookability.isBookable).toBe(true)
      expect((dto?.bookability as any).durationDays).toBe(4)
      expect(dto?.departureSlots).toEqual([])
      expect(dto?.pricing?.totalPrice.convertedAmount).toBe(16000)
    })

    it('should return empty images array when no gallery or hero is configured (no mock placeholder)', async () => {
      const mockExp = {
        id: 11,
        slug: 'desert-trek',
        title: 'Desert Trek Adventure',
        type: 'daily_tour',
        availability: 'available',
        cityId: 102,
        price: 2000,
        durationMinutes: 240,
        heroUrl: undefined,
        gallery: [],
        schedules: [{ startTime: '09:00' }],
      }

      const mockApplicationServices = {
        experience: {
          getBySlug: vi.fn().mockResolvedValue(mockExp),
          getById: vi.fn().mockResolvedValue(mockExp),
          getDestinationTimezone: vi.fn().mockResolvedValue('Africa/Cairo'),
          findSlotsByExperienceId: vi.fn().mockResolvedValue([]),
          resolveDefaultSlot: vi.fn().mockReturnValue(null),
        },
        destination: {
          getCityById: vi.fn().mockResolvedValue(null),
        },
        localization: {
          buildContext: vi.fn().mockResolvedValue({ language: 'en', currency: 'EGP', timezone: 'Africa/Cairo' }),
          translateBatch: vi.fn().mockImplementation((texts: string[]) => Promise.resolve(texts)),
          formatPrice: vi.fn().mockImplementation((amount: number) =>
            Promise.resolve({ amount, formatted: `${amount} EGP`, currency: 'EGP', currencySymbol: 'EGP' }),
          ),
        },
        bookingPricingUseCase: {
          calculate: vi.fn(),
          calculatePreview: vi.fn().mockResolvedValue({
            unitPrice: { baseAmountEGP: 2000, convertedAmount: 2000, formatted: '2,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
            totalCost: { baseAmountEGP: 4000, convertedAmount: 4000, formatted: '4,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
          }),
        },
      }

      ;(getApplicationServices as any).mockResolvedValue(mockApplicationServices)

      const dto = await ExperienceDetailsLoader.loadBySlug('desert-trek')
      expect(dto).not.toBeNull()
      expect(dto?.images).toEqual([])
      expect(dto?.bookability.model).toBe('daily_tour')
      expect(dto?.bookability.isBookable).toBe(true)
    })
  })
})
