// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExperienceDetailsPage } from '@/components/features/experience/ExperienceDetailsPage'
import type { ExperienceDetailsDTO } from '@/application/experience/dto-details'
import { resolvePricingAction } from '@/application/actions/pricing-actions'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/providers', () => ({
  useCurrency: () => ({
    currency: 'EGP',
    setCurrency: vi.fn(),
  }),
  useToast: () => ({
    addToast: vi.fn(),
  }),
}))

vi.mock('@/application/actions/pricing-actions', () => ({
  resolvePricingAction: vi.fn(),
}))

describe('BATCH 17D/17E — UI Presentation & Component Convergence: ExperienceDetailsPage', () => {
  const baseMockData: ExperienceDetailsDTO = {
    id: 101,
    slug: 'luxury-nile-adventure',
    title: 'Luxury Nile Adventure',
    subtitle: 'An authentic voyage through the ancient Egyptian river.',
    type: 'package',
    packageMode: 'fixed_date',
    bookability: {
      model: 'fixed_package',
      isBookable: true,
      departureSlots: [
        {
          id: 55,
          departureId: 'DEP-101-2026-11-01-0000',
          departureDate: '2026-11-01',
          availableSeats: 6,
          priceOverrideEGP: 20000,
          status: 'available',
        },
        {
          id: 56,
          departureId: 'DEP-101-2026-11-15-0000',
          departureDate: '2026-11-15',
          availableSeats: 0,
          status: 'sold_out',
        },
      ],
      defaultSlotId: 55,
    },
    location: 'Luxor, Egypt',
    destinationTimezone: 'Africa/Cairo',
    durationDays: 5,
    durationNights: 4,
    formattedDuration: '5 Days / 4 Nights',
    descriptionHtml: '<p>Explore Luxor and Aswan in unmatched style.</p>',
    policiesHtml: '<p>Cancellation policy: Full refund up to 7 days before departure.</p>',
    initialAdults: 2,
    rating: 4.9,
    reviewsCount: 42,
    images: ['/media/nile-1.jpg', '/media/nile-2.jpg'],
    itinerary: [
      { dayNumber: 1, title: 'Arrival & Embarkation', description: 'Meet and transfer to Nile Cruise' },
      { dayNumber: 2, title: 'Valley of the Kings', description: 'Explore ancient royal tombs' },
    ],
    includedServices: ['5-star accommodation', 'Private Egyptologist'],
    excludedServices: ['International flights', 'Gratuities'],
    departureSlots: [
      {
        id: 55,
        departureId: 'DEP-101-2026-11-01-0000',
        departureDate: '2026-11-01',
        availableSeats: 6,
        priceOverrideEGP: 20000,
        status: 'available',
      },
      {
        id: 56,
        departureId: 'DEP-101-2026-11-15-0000',
        departureDate: '2026-11-15',
        availableSeats: 0,
        status: 'sold_out',
      },
    ],
    defaultSlotId: 55,
    blackouts: [],
    pricing: {
      unitPrice: { baseAmountEGP: 20000, convertedAmount: 20000, formatted: '20,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
      totalPrice: { baseAmountEGP: 40000, convertedAmount: 40000, formatted: '40,000 EGP', currencyCode: 'EGP', currencySymbol: 'EGP', exchangeRate: 1, decimals: 0 },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all authoritative DTO fields faithfully without fallbacks', () => {
    render(<ExperienceDetailsPage data={baseMockData} />)

    expect(screen.getByText('Luxury Nile Adventure')).toBeDefined()
    expect(screen.getByText('An authentic voyage through the ancient Egyptian river.')).toBeDefined()
    expect(screen.getByText(/Tour Package/i)).toBeDefined()
    expect(screen.getByText(/Luxor, Egypt/i)).toBeDefined()
    expect(screen.getByText(/5 Days \/ 4 Nights/i)).toBeDefined()

    // Policies section
    expect(screen.getByText(/Policies & Cancellation Terms/i)).toBeDefined()
    expect(screen.getByText(/Full refund up to 7 days/i)).toBeDefined()

    // Itinerary
    expect(screen.getByText('Arrival & Embarkation')).toBeDefined()
    expect(screen.getByText('Valley of the Kings')).toBeDefined()

    // Checklist
    expect(screen.getByText('5-star accommodation')).toBeDefined()
    expect(screen.getByText('International flights')).toBeDefined()

    // Package slots
    expect(screen.getByText(/2026-11-01/i)).toBeDefined()
    expect(screen.getByText(/6 Seats Left/i)).toBeDefined()
    expect(screen.getByText(/Sold Out/i)).toBeDefined()
  })

  it('handles Daily Tour with dynamic schedule selection and invokes Server Action', async () => {
    const { durationDays, durationNights, packageMode, ...sharedBase } = baseMockData
    const dailyTourData: ExperienceDetailsDTO = {
      ...sharedBase,
      type: 'daily_tour',
      bookability: {
        model: 'daily_tour',
        isBookable: true,
        initialSuggestedDate: '2026-11-25',
        initialSuggestedTime: '09:00',
        minDate: '2026-11-25',
        durationMinutes: 240,
        schedules: [
          { startTime: '09:00', defaultCapacity: 15, label: 'Morning Tour' },
          { startTime: '14:00', defaultCapacity: 15, label: 'Sunset Tour' },
        ],
        blackouts: [],
      },
      durationMinutes: 240,
      formattedDuration: '4 Hours',
      departureSlots: [],
      defaultSlotId: null,
      schedules: [
        { startTime: '09:00', defaultCapacity: 15, label: 'Morning Tour' },
        { startTime: '14:00', defaultCapacity: 15, label: 'Sunset Tour' },
      ],
      blackouts: [],
    }

    ;(resolvePricingAction as any).mockResolvedValue({
      success: true,
      slotId: 888,
      pricing: {
        unitPrice: { amount: 3000, formatted: '3,000 EGP', currency: 'EGP', currencySymbol: 'EGP' },
        totalPrice: { amount: 6000, formatted: '6,000 EGP', currency: 'EGP', currencySymbol: 'EGP' },
      },
    })

    render(<ExperienceDetailsPage data={dailyTourData} />)

    expect(screen.getByText(/Daily Tour/i)).toBeDefined()
    expect(screen.getByText(/09:00/i)).toBeDefined()
    expect(screen.getByText(/Sunset Tour/i)).toBeDefined()

    // Select Tour Date
    const dateInput = document.querySelector('input[type="date"]')!
    fireEvent.change(dateInput, { target: { value: '2026-11-25' } })

    // Select Afternoon slot
    const sunsetButton = screen.getByText(/14:00/i)
    fireEvent.click(sunsetButton)

    await waitFor(() => {
      expect(resolvePricingAction).toHaveBeenCalledWith(
        expect.objectContaining({
          experienceId: 101,
          date: '2026-11-25',
          startTime: '14:00',
          adults: 2,
        }),
      )
    })
  })

  it('renders an authentic empty state when a fixed package has no upcoming departures', () => {
    const emptySlotData: ExperienceDetailsDTO = {
      ...baseMockData,
      bookability: {
        model: 'fixed_package',
        isBookable: false,
        departureSlots: [],
        defaultSlotId: null,
      },
      departureSlots: [],
      defaultSlotId: null,
      pricing: null,
    }

    render(<ExperienceDetailsPage data={emptySlotData} />)

    expect(screen.getByText(/This package currently has no upcoming available departure slots/i)).toBeDefined()
    expect(screen.getByText(/Explore Other Experiences/i)).toBeDefined()
  })
})
