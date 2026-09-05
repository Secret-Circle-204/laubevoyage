// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import { CheckoutPage } from '@/components/features/checkout/CheckoutPage'
import type { CheckoutPageDTO } from '@/application/booking/dto-checkout'
import type { ConvertedPrice } from '@/domains/currency/types'
import { resolvePricingAction } from '@/application/actions/pricing-actions'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/providers', () => ({
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
  }),
  useToast: () => ({
    addToast: vi.fn(),
  }),
}))

vi.mock('@/application/actions/booking-actions', () => ({
  confirmCheckoutAction: vi.fn(),
}))

vi.mock('@/application/actions/pricing-actions', () => ({
  resolvePricingAction: vi.fn(),
}))

function makeConvertedPrice(amount: number, formatted?: string): ConvertedPrice {
  return {
    baseAmountEGP: amount,
    convertedAmount: amount,
    currencyCode: 'EGP',
    currencySymbol: 'EGP',
    formatted: formatted || `${amount.toLocaleString()}.00 EGP`,
    exchangeRate: 1,
    decimals: 2,
  }
}

describe('Gate 1 Verification: CheckoutPage Live Loyalty Repricing', () => {
  const baseMockDTO: CheckoutPageDTO = {
    bookingId: 'new',
    experienceId: 693,
    slotId: 768,
    experienceTitle: 'Cairo and Nile Express - 3 Days Luxury Fixed Package',
    experienceType: 'package',
    imageUrl: 'https://example.com/hero.jpg',
    departureDate: '2026-10-15',
    startTime: '10:00',
    adultsCount: 18,
    childrenCount: 4,
    childAges: [6, 6, 6, 6],
    childBeddingModes: ['sharing_bed', 'sharing_bed', 'sharing_bed', 'sharing_bed'],
    requestedRooms: 5,
    basePricePerPersonEGP: 12500,
    subtotalPrice: makeConvertedPrice(250000, '250,000.00 EGP'),
    promoDiscountEGP: 0,
    totalCost: makeConvertedPrice(250000, '250,000.00 EGP'),
    availableLoyaltyPoints: 1290,
    redemptionUnit: 10,
    minRedemptionPoints: 100,
    maxRedemptionPercent: 20,
    redemptionStepUnit: 10,
    gateways: [
      { id: 'stripe', name: 'Credit / Debit Card', icon: '💳', isAvailable: true },
    ],
    leadTraveler: {
      firstName: 'Hamza',
      lastName: 'Bahaa',
      email: 'customer@laubevoyage.com',
      phone: '+201000000000',
    },
  }

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders initial state with points unchecked and baseline pricing', () => {
    render(<CheckoutPage data={baseMockDTO} />)

    expect(screen.getByText('Apply Loyalty Points')).toBeDefined()
    expect(screen.getByText('1,290 Points Available')).toBeDefined()
    expect(screen.getByText('Redeem loyalty points for a discount on this booking')).toBeDefined()

    // 250,000.00 EGP appears in Subtotal and Total
    const priceElements = screen.getAllByText('250,000.00 EGP')
    expect(priceElements.length).toBeGreaterThan(0)

    // Summary does NOT yet have loyalty line
    expect(screen.queryByText('Loyalty Points Discount')).toBeNull()
  })

  it('dispatches resolvePricingAction on checking points and entering 620 points, updating discount and total', async () => {
    // Mock server returning authoritative re-evaluation
    vi.mocked(resolvePricingAction).mockImplementation(async (params: any) => ({
      success: true,
      pricing: {
        unitPrice: baseMockDTO.subtotalPrice,
        totalPrice: makeConvertedPrice(249380, '249,380.00 EGP'),
        originalPrice: baseMockDTO.subtotalPrice,
        loyaltyDiscountPrice: makeConvertedPrice(620, '620.00 EGP'),
        remainingLoyaltyPoints: 670,
        estimatedEarnPoints: 2493,
      },
    }))

    render(<CheckoutPage data={baseMockDTO} />)

    const checkbox = screen.getByLabelText(/Redeem loyalty points/i)
    fireEvent.click(checkbox)

    // Input field should now appear
    const input = screen.getByRole('spinbutton')
    expect(input).toBeDefined()

    // Enter 620 points
    fireEvent.change(input, { target: { value: '620' } })

    // Wait for debounced action call
    await waitFor(() => {
      expect(resolvePricingAction).toHaveBeenCalledWith(
        expect.objectContaining({
          experienceId: 693,
          slotId: 768,
          adults: 18,
          children: 4,
          pointsToRedeem: 620,
        }),
      )
    })

    // Authoritative badges update
    await waitFor(() => {
      expect(screen.getByText('670 pts')).toBeDefined()
    })

    // Booking Summary card displays loyalty discount line and updated total
    expect(screen.getByText('Loyalty Points Discount')).toBeDefined()
    expect(screen.getByText('-620.00 EGP')).toBeDefined()
    expect(screen.getByText('249,380.00 EGP')).toBeDefined()
  })

  it('validates invalid non-integer or negative points input synchronously and prevents action call', async () => {
    render(<CheckoutPage data={baseMockDTO} />)

    const checkbox = screen.getByLabelText(/Redeem loyalty points/i)
    fireEvent.click(checkbox)

    const input = screen.getByRole('spinbutton')

    // Enter negative points
    fireEvent.change(input, { target: { value: '-50' } })

    await waitFor(() => {
      expect(screen.getByText(/Points must be a valid non-negative integer/i)).toBeDefined()
    })

    // Server action must NOT have been called with negative points
    expect(resolvePricingAction).not.toHaveBeenCalledWith(
      expect.objectContaining({
        pointsToRedeem: -50,
      }),
    )
  })

  it('guards against out-of-order responses (race condition protection)', async () => {
    let resolveFirstRequest: any
    const firstPromise = new Promise((resolve) => {
      resolveFirstRequest = resolve
    })

    const secondResult = {
      success: true,
      pricing: {
        unitPrice: baseMockDTO.subtotalPrice,
        totalPrice: makeConvertedPrice(249380, '249,380.00 EGP'),
        loyaltyDiscountPrice: makeConvertedPrice(620, '620.00 EGP'),
        remainingLoyaltyPoints: 670,
      },
    }

    vi.mocked(resolvePricingAction)
      .mockImplementationOnce(() => firstPromise as any) // first request (delayed)
      .mockResolvedValueOnce(secondResult) // second request (fast)

    render(<CheckoutPage data={baseMockDTO} />)

    const checkbox = screen.getByLabelText(/Redeem loyalty points/i)
    fireEvent.click(checkbox)

    const input = screen.getByRole('spinbutton')

    // Customer types 500 then quickly 620
    fireEvent.change(input, { target: { value: '500' } })
    await new Promise((r) => setTimeout(r, 200))

    fireEvent.change(input, { target: { value: '620' } })
    await new Promise((r) => setTimeout(r, 200))

    // Second request completes and shows 620
    await waitFor(() => {
      expect(screen.getByText('620.00 EGP')).toBeDefined()
    })

    // Now first request completes late with 500
    act(() => {
      resolveFirstRequest({
        success: true,
        pricing: {
          unitPrice: baseMockDTO.subtotalPrice,
          totalPrice: makeConvertedPrice(249500, '249,500.00 EGP'),
          loyaltyDiscountPrice: makeConvertedPrice(500, '500.00 EGP'),
          remainingLoyaltyPoints: 790,
        },
      })
    })

    // UI must STILL show 620.00 EGP and 249,380.00 EGP (not overwritten by stale 500)
    await waitFor(() => {
      expect(screen.getByText('620.00 EGP')).toBeDefined()
      expect(screen.getByText('249,380.00 EGP')).toBeDefined()
      expect(screen.queryByText('500.00 EGP')).toBeNull()
    })
  })

  it('restores non-redemption baseline when points are toggled OFF', async () => {
    vi.mocked(resolvePricingAction).mockImplementation(async (params: any) => {
      if (params.pointsToRedeem && params.pointsToRedeem > 0) {
        return {
          success: true,
          pricing: {
            unitPrice: baseMockDTO.subtotalPrice,
            totalPrice: makeConvertedPrice(249380, '249,380.00 EGP'),
            loyaltyDiscountPrice: makeConvertedPrice(620, '620.00 EGP'),
            remainingLoyaltyPoints: 670,
          },
        }
      }
      return {
        success: true,
        pricing: {
          unitPrice: baseMockDTO.subtotalPrice,
          totalPrice: baseMockDTO.totalCost,
          loyaltyDiscountPrice: undefined,
          remainingLoyaltyPoints: 1290,
        },
      }
    })

    render(<CheckoutPage data={baseMockDTO} />)

    const checkbox = screen.getByLabelText(/Redeem loyalty points/i)
    fireEvent.click(checkbox)

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '620' } })

    await waitFor(() => {
      expect(screen.getByText('620.00 EGP')).toBeDefined()
    })

    // Now uncheck points
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(resolvePricingAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pointsToRedeem: undefined,
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getAllByText('250,000.00 EGP').length).toBeGreaterThan(0)
      expect(screen.queryByText('Loyalty Points Discount')).toBeNull()
    })
  })
})
